import { Elysia } from 'elysia';
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  uploadAttachment,
} from '../../../../application/use-cases/attachment';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { ATTACHMENT_ERRORS } from '../errors';
import { transactionParamsSchema } from '../schemas';

/** Folga sobre o limite real do arquivo pra cobrir boundary/headers do multipart em si. */
const MAX_REQUEST_BODY_BYTES = MAX_ATTACHMENT_SIZE_BYTES + 64 * 1024;

export const uploadAttachmentRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/transactions/:transactionId/attachment',
    async ({ request, params, set }) => {
      const p = validateParams(transactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);

      // Auditoria de segurança (2026-07-19): rejeita pelo Content-Length ANTES de
      // consumir o stream — sem isso, o corpo inteiro (até vários GB) ia pra
      // memória antes do limite de 5MB ser checado dentro da use-case.
      const contentLength = Number(
        request.headers.get('content-length') ?? '0'
      );
      if (contentLength > MAX_REQUEST_BODY_BYTES) {
        return fail(set, ATTACHMENT_ERRORS.file_too_large);
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
      const result = await uploadAttachment(
        deps,
        auth.value,
        p.value.transactionId,
        {
          buffer,
          contentType: file.type,
          size: buffer.byteLength,
        }
      );
      return respond(set, result, ATTACHMENT_ERRORS, 200);
    }
  );
