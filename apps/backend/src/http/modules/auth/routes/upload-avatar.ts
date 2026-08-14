import { Elysia } from 'elysia';
import {
  MAX_AVATAR_SIZE_BYTES,
  uploadAvatar,
} from '../../../../application/use-cases/auth';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { AUTH_ERRORS } from '../errors';

/** Folga sobre o limite real do arquivo pra cobrir boundary/headers do multipart em si. */
const MAX_REQUEST_BODY_BYTES = MAX_AVATAR_SIZE_BYTES + 64 * 1024;

export const uploadAvatarRoute = (deps: AppDeps) =>
  new Elysia().post('/me/avatar', async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    // Mesmo cuidado do upload de comprovante (M3-04): rejeita pelo
    // Content-Length antes de consumir o stream inteiro pra memória.
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > MAX_REQUEST_BODY_BYTES) {
      return fail(set, AUTH_ERRORS.file_too_large);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return fail(set, {
        status: 400,
        code: 'validation_error',
        message: 'Arquivo não enviado.',
      });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const result = await uploadAvatar(deps, auth.value.userId, {
      buffer,
      contentType: file.type,
      size: buffer.byteLength,
    });
    return respond(set, result, AUTH_ERRORS, 200);
  });
