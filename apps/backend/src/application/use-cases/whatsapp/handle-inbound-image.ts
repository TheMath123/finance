import type { UseCaseDeps } from '../../deps';
import { uploadAttachment } from '../attachment';
import type { WhatsAppReply } from './handle-inbound-message';

export interface InboundWhatsAppImage {
  from: string;
  /** Já baixado pelo job handler (infra) — a use-case não fala com a Meta Cloud API. */
  buffer: Uint8Array;
  mimeType: string;
}

/** Foto associada à última transação do remetente se vencer nesse tempo — sem isso não dá pra saber a qual ela se refere. */
const ASSOCIATION_WINDOW_MS = 5 * 60_000;

/**
 * Foto recebida no WhatsApp vira o comprovante da última transação que o
 * remetente lançou (app ou chatbot) nos últimos 5 minutos (M3-05). Reaproveita
 * `uploadAttachment` (M3-04) — mesma validação de tipo/tamanho e mesma regra
 * de "substitui o anexo anterior" (cobre o caso de chegarem duas fotos: a
 * segunda simplesmente troca a primeira, sem lógica especial).
 */
export async function handleInboundWhatsAppImage(
  deps: Pick<UseCaseDeps, 'repos' | 'storage'>,
  image: InboundWhatsAppImage
): Promise<WhatsAppReply> {
  const user = await deps.repos.user.findByPhone(image.from);
  if (!user) {
    return {
      to: image.from,
      body: 'Esse número ainda não está vinculado a nenhuma conta. Abra o app, vá em Perfil > WhatsApp e gere um código de vínculo.',
    };
  }

  const workspaceId = user.defaultWorkspaceId;
  if (!workspaceId) {
    return {
      to: image.from,
      body: 'Sua conta ainda não tem um workspace padrão configurado. Abra o app pra concluir seu cadastro.',
    };
  }

  const since = new Date(Date.now() - ASSOCIATION_WINDOW_MS);
  const recent = await deps.repos.transaction.findMostRecentByCreator(
    workspaceId,
    user.id,
    since
  );
  if (!recent) {
    return {
      to: image.from,
      body: 'Não encontrei nenhuma transação recente pra anexar essa foto. Manda o valor/descrição da despesa primeiro.',
    };
  }

  const result = await uploadAttachment(
    deps,
    { userId: user.id, workspaceId, role: 'member' },
    recent.id,
    {
      buffer: image.buffer,
      contentType: image.mimeType,
      size: image.buffer.byteLength,
    }
  );

  if (!result.ok) {
    const body =
      result.error === 'invalid_file_type'
        ? 'Esse tipo de arquivo não é aceito como comprovante — manda uma foto (jpg, png ou webp).'
        : result.error === 'file_too_large'
          ? 'Essa foto é grande demais (limite de 5MB) — tenta mandar com menos qualidade.'
          : 'Não consegui anexar a foto — tenta de novo ou anexa pelo app.';
    return { to: image.from, body };
  }

  return {
    to: image.from,
    body: `Comprovante anexado em "${recent.description}".`,
  };
}
