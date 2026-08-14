import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AuthError } from './errors';

/**
 * Só imagem (jpg/png/webp), mesma whitelist do anexo de comprovante (M3-04)
 * — duplicada aqui de propósito, mesmo padrão do projeto de manter o limite
 * junto do use-case que o usa. 2MB é o suficiente pra foto de perfil, não
 * precisa dos 5MB do comprovante.
 */
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

export interface UploadAvatarInput {
  buffer: Uint8Array;
  contentType: string;
  size: number;
}

/** Upload manual de avatar (M5-07) — sobrescreve a foto do Google, se houver, até ser removido. */
export async function uploadAvatar(
  deps: Pick<UseCaseDeps, 'repos' | 'storage'>,
  userId: string,
  input: UploadAvatarInput
): Promise<Either<AuthError, { avatarKey: string }>> {
  const ext = ALLOWED_CONTENT_TYPES[input.contentType];
  if (!ext) return left('invalid_file_type');
  if (input.size > MAX_AVATAR_SIZE_BYTES) return left('file_too_large');

  const user = await deps.repos.user.findById(userId);
  if (!user) throw new Error('usuário autenticado não encontrado');

  // Substitui: nunca acumula lixo órfão no bucket se já tinha um avatar.
  if (user.avatarKey) {
    await deps.storage.delete(user.avatarKey);
  }

  const key = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
  await deps.storage.upload(key, input.buffer, input.contentType);
  await deps.repos.user.updateAvatarKey(userId, key);

  return right({ avatarKey: key });
}
