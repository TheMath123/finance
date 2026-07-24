import { Elysia } from 'elysia';
import {
  verifyWebhookChallenge,
  verifyWebhookSignature,
} from '../../../../infra/whatsapp/meta-cloud-api';
import type { AppDeps } from '../../../deps';

interface MetaWebhookPayload {
  entry?: {
    changes?: {
      field?: string;
      value?: {
        messages?: {
          id: string;
          from: string;
          type: string;
          text?: { body: string };
          image?: { id: string; mime_type: string };
        }[];
      };
    }[];
  }[];
}

/**
 * TTL da marca de dedup por `wamid` (auditoria 2026-07-19): a Meta assina o payload,
 * mas não impede replay — um payload capturado podia ser reenviado indefinidamente e
 * gerar transações duplicadas. 7 dias cobre com folga a janela de reentrega da Meta.
 */
const WAMID_DEDUP_TTL_SECONDS = 7 * 24 * 60 * 60;

/** true se já processamos essa mensagem (marca-e-testa via cache, não precisa ser atômico:
 * o risco aqui é replay deliberado, não uma corrida de entregas simultâneas legítimas). */
async function alreadyProcessed(
  deps: AppDeps,
  wamid: string
): Promise<boolean> {
  const key = `whatsapp:wamid:${wamid}`;
  if (await deps.cache.get<true>(key)) return true;
  await deps.cache.set(key, true, WAMID_DEDUP_TTL_SECONDS);
  return false;
}

/** Meta às vezes manda o número com "+" na frente — normaliza pro mesmo formato salvo em `users.phone`. */
function normalizePhone(from: string): string {
  return from.startsWith('+') ? from.slice(1) : from;
}

function extractTextMessages(
  payload: MetaWebhookPayload
): { wamid: string; from: string; text: string }[] {
  const messages: { wamid: string; from: string; text: string }[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      for (const message of change.value?.messages ?? []) {
        if (message.type === 'text' && message.text?.body) {
          messages.push({
            wamid: message.id,
            from: normalizePhone(message.from),
            text: message.text.body,
          });
        }
      }
    }
  }
  return messages;
}

/** M3-05: a Meta manda só o `media_id` — o download acontece no job (nunca aqui, síncrono). */
function extractImageMessages(
  payload: MetaWebhookPayload
): { wamid: string; from: string; mediaId: string; mimeType: string }[] {
  const messages: {
    wamid: string;
    from: string;
    mediaId: string;
    mimeType: string;
  }[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      for (const message of change.value?.messages ?? []) {
        if (message.type === 'image' && message.image?.id) {
          messages.push({
            wamid: message.id,
            from: normalizePhone(message.from),
            mediaId: message.image.id,
            mimeType: message.image.mime_type ?? 'image/jpeg',
          });
        }
      }
    }
  }
  return messages;
}

/**
 * Webhook da Meta Cloud API (conversa privada, M2-06 — grupos ficam de fora
 * por ora: a Groups API exige um número com "Official Business Account", que
 * o número de teste atual não tem).
 */
export const whatsappWebhookRoute = (deps: AppDeps) =>
  new Elysia()
    // Verificação inicial do webhook no painel do Meta (hub.challenge).
    .get('/whatsapp/webhook', ({ query, set }) => {
      const mode =
        (query as Record<string, string | undefined>)['hub.mode'] ?? null;
      const token =
        (query as Record<string, string | undefined>)['hub.verify_token'] ??
        null;
      const challenge =
        (query as Record<string, string | undefined>)['hub.challenge'] ?? null;
      if (challenge && verifyWebhookChallenge(mode, token)) {
        set.status = 200;
        return challenge;
      }
      set.status = 403;
      return 'Forbidden';
    })
    // A Meta exige resposta rápida — nunca processar de forma síncrona aqui
    // (spec M2-06): só valida a assinatura e enfileira, sem esperar o job.
    .post('/whatsapp/webhook', async ({ request, set }) => {
      const raw = await request.text();
      const signature = request.headers.get('x-hub-signature-256');
      deps.httpLogger.info(
        {
          scope: 'whatsapp',
          bodyLength: raw.length,
          hasSignature: !!signature,
        },
        'webhook_post_received'
      );

      const sigCheck = verifyWebhookSignature(raw, signature);
      if (!sigCheck.valid) {
        deps.httpLogger.warn(
          { scope: 'whatsapp', reason: sigCheck.reason },
          'webhook_signature_rejected'
        );
        set.status = 401;
        return;
      }
      set.status = 200;

      let payload: MetaWebhookPayload;
      try {
        payload = JSON.parse(raw);
      } catch (error) {
        deps.httpLogger.warn(
          { scope: 'whatsapp', err: error },
          'webhook_payload_invalid_json'
        );
        return;
      }

      const messages = extractTextMessages(payload);
      deps.httpLogger.info(
        { scope: 'whatsapp', count: messages.length },
        'webhook_received'
      );
      for (const { wamid, from, text } of messages) {
        if (await alreadyProcessed(deps, wamid)) {
          deps.httpLogger.warn(
            { scope: 'whatsapp', wamid },
            'webhook_message_replayed'
          );
          continue;
        }
        void deps
          .dispatch('whatsapp.inbound-message', { from, text })
          .catch((error) =>
            deps.httpLogger.error(
              { scope: 'whatsapp', err: error },
              'dispatch_failed'
            )
          );
      }

      const images = extractImageMessages(payload);
      deps.httpLogger.info(
        { scope: 'whatsapp', count: images.length },
        'webhook_image_received'
      );
      for (const { wamid, from, mediaId, mimeType } of images) {
        if (await alreadyProcessed(deps, wamid)) {
          deps.httpLogger.warn(
            { scope: 'whatsapp', wamid },
            'webhook_image_replayed'
          );
          continue;
        }
        void deps
          .dispatch('whatsapp.inbound-image', { from, mediaId, mimeType })
          .catch((error) =>
            deps.httpLogger.error(
              { scope: 'whatsapp', err: error },
              'dispatch_failed'
            )
          );
      }
    });
