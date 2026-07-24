import type { Either } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/**
 * Iniciar vínculo continua exclusivo do app (depende de mandar o OTP a
 * partir de um número que o usuário já tem no celular) — o dashboard só
 * mostra o status (via `SessionUser.phone`, já exposto por `/auth/me`) e
 * revoga.
 */
export function revokeWhatsAppLink(accessToken: string): Promise<Either<ApiError, unknown>> {
	return apiRequest('/whatsapp/link', { method: 'DELETE', accessToken });
}
