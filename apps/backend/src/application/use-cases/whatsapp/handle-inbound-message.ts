import { parseAmountAndRest } from '../../../domain/services/transaction-text-parser';
import type { UseCaseDeps } from '../../deps';
import { createTransaction } from '../transaction/create-transaction';
import { parseObviousTransaction } from '../transaction/parse-obvious-transaction';
import {
  resolveAccountOrCard,
  routeChatbotMessage,
} from '../transaction/route-chatbot-message';
import { confirmWhatsAppLink } from './confirm-link';

export interface InboundWhatsAppMessage {
  from: string;
  text: string;
}

export interface WhatsAppReply {
  to: string;
  body: string;
}

const SIX_DIGIT_CODE = /^\d{6}$/;

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Guardrail de custo (spec): quando o orçamento de tokens estourou ou a IA
 * falhou/está fora do ar, cai pro mesmo parser determinístico da Camada 0,
 * mas sem exigir cache de categorização — usa a categoria fallback
 * ("Outros") em vez de desistir. Só registra se der pra resolver conta/
 * cartão sem ambiguidade; do contrário, pede pra registrar pelo app.
 */
async function deterministicFallback(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  workspaceId: string,
  userId: string,
  text: string,
  prefix: string
): Promise<string> {
  const parsed = parseAmountAndRest(text);
  if (!parsed) {
    return `${prefix}No momento não consigo interpretar mensagens livres — tenta o formato "valor descrição" ou registra pelo app.`;
  }

  const target = await resolveAccountOrCard(deps, workspaceId, null);
  if (!target || target === 'ambiguous') {
    return `${prefix}Não consegui saber em qual conta/cartão registrar — registra pelo app, por favor.`;
  }

  const fallbackCategory = await deps.repos.category.findFallback(workspaceId);
  if (!fallbackCategory) {
    return `${prefix}Não consegui registrar automaticamente — registra pelo app, por favor.`;
  }

  const result = await createTransaction(
    deps,
    { userId, workspaceId, role: 'member' },
    {
      description: parsed.rest,
      amount: parsed.amountCents,
      type: 'expense',
      method: target.kind === 'card' ? 'credit' : 'pix',
      date: todayIso(),
      categoryId: fallbackCategory.id,
      accountId: target.kind === 'account' ? target.id : undefined,
      cardId: target.kind === 'card' ? target.id : undefined,
      source: 'chatbot',
    }
  );
  if (!result.ok)
    return `${prefix}Não consegui registrar — registra pelo app, por favor.`;

  return `${prefix}Registrei "${parsed.rest}" — R$ ${(parsed.amountCents / 100).toFixed(2)} em "${fallbackCategory.name}". Corrija a categoria no app se precisar.`;
}

/**
 * Roteamento de mensagem recebida no webhook (M2-06/M2-07) — decide o que
 * responder, mas não envia nada: quem chama (job handler,
 * `main/job-handlers.ts`) é quem fala com a Meta Cloud API, mantendo a
 * use-case livre de infra concreta (mesmo padrão do e-mail: use-case
 * dispara/decide, `mailer`/`sendWhatsAppText` só são chamados no handler).
 * Número não vinculado só recebe instrução de vínculo — nunca dado
 * financeiro (spec). Número vinculado passa pelo pipeline de IA em camadas
 * (M2-07): Camada 0 determinística primeiro; se não resolver, Camada 1/2
 * (IA), guardada por um orçamento diário de tokens por usuário — sem
 * orçamento ou com a IA fora do ar, cai pro fallback determinístico acima
 * em vez de travar o usuário.
 */
export async function handleInboundWhatsAppMessage(
  deps: Pick<
    UseCaseDeps,
    | 'repos'
    | 'rateLimiter'
    | 'tokenBudget'
    | 'tokens'
    | 'uow'
    | 'dispatch'
    | 'cache'
    | 'notificationBus'
  >,
  message: InboundWhatsAppMessage
): Promise<WhatsAppReply> {
  const user = await deps.repos.user.findByPhone(message.from);

  if (!user) {
    const trimmed = message.text.trim();
    if (SIX_DIGIT_CODE.test(trimmed)) {
      const result = await confirmWhatsAppLink(deps, message.from, trimmed);
      return {
        to: message.from,
        body: result.ok
          ? `Vínculo confirmado, ${result.value.userName}! Suas transações por aqui vão pro workspace "${result.value.workspaceName}".`
          : 'Código inválido ou expirado. Gere um novo no app (Perfil > WhatsApp) e tente de novo.',
      };
    }
    return {
      to: message.from,
      body: 'Esse número ainda não está vinculado a nenhuma conta. Abra o app, vá em Perfil > WhatsApp e gere um código de vínculo.',
    };
  }

  const workspaceId = user.defaultWorkspaceId;
  if (!workspaceId) {
    return {
      to: message.from,
      body: 'Sua conta ainda não tem um workspace padrão configurado. Abra o app pra concluir seu cadastro.',
    };
  }

  // Camada 0 (custo zero): resolve sozinha os casos óbvios com categoria já conhecida.
  const obvious = await parseObviousTransaction(
    deps,
    workspaceId,
    message.text
  );
  if (obvious) {
    const result = await createTransaction(
      deps,
      { userId: user.id, workspaceId, role: 'member' },
      { ...obvious, source: 'chatbot' }
    );
    if (result.ok) {
      return {
        to: message.from,
        body: `Registrado: ${obvious.description} — R$ ${(obvious.amount / 100).toFixed(2)}.`,
      };
    }
    // Falhou por algum motivo pontual (ex.: categoria removida entre o parse e o create) — segue pro pipeline de IA.
  }

  if (await deps.tokenBudget.isOverBudget(user.id)) {
    const body = await deterministicFallback(
      deps,
      workspaceId,
      user.id,
      message.text,
      'Você atingiu o limite diário de mensagens processadas por IA. '
    );
    return { to: message.from, body };
  }

  try {
    const reply = await routeChatbotMessage(
      deps,
      workspaceId,
      user.id,
      message.text
    );
    await deps.tokenBudget.recordUsage(
      user.id,
      reply.usage.inputTokens + reply.usage.outputTokens
    );
    // M4-09: log por camada pra métrica de gasto de IA no painel de superadmin.
    await Promise.all(
      reply.usageByLayer.map((u) =>
        deps.repos.aiUsageLog.record({
          userId: user.id,
          layer: u.layer,
          inputTokens: u.inputTokens,
          outputTokens: u.outputTokens,
        })
      )
    );
    return { to: message.from, body: reply.body };
  } catch {
    const body = await deterministicFallback(
      deps,
      workspaceId,
      user.id,
      message.text,
      ''
    );
    return { to: message.from, body };
  }
}
