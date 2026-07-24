import { type Either, left, right } from '@finance/shared';
import type { ZodType } from 'zod';
import type { HttpError } from './http-error';

/** Body/query validados com Zod (spec: toda entrada HTTP validada na borda). */
export function validateBody<T>(
  schema: ZodType<T>,
  body: unknown
): Either<HttpError, T> {
  const result = schema.safeParse(body);
  if (result.success) return right(result.data);
  return left({
    status: 400,
    code: 'validation_error',
    message: 'Payload inválido.',
    issues: result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    })),
  });
}

export const validateQuery = validateBody;

/**
 * Path params validados com Zod. UUID malformado responde 404 genérico — não
 * identifica recurso algum, e o 404 não distingue "malformado" de "inexistente"
 * (evita virar oráculo; spec: validação de path params).
 */
export function validateParams<T>(
  schema: ZodType<T>,
  params: unknown
): Either<HttpError, T> {
  const result = schema.safeParse(params);
  if (result.success) return right(result.data);
  return left({
    status: 404,
    code: 'not_found',
    message: 'Recurso não encontrado.',
  });
}
