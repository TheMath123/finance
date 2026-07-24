import type { Either } from '@finance/shared';

/** Envelope único de erro da API (spec: Tratamento de erros). */
export interface HttpError {
  status: number;
  code: string;
  message: string;
  issues?: { path: string; message: string }[];
}

interface StatusSetter {
  status?: number | string;
}

export function fail(set: StatusSetter, error: HttpError) {
  set.status = error.status;
  return {
    error: { code: error.code, message: error.message, issues: error.issues },
  };
}

/**
 * Mapeia o resultado de um use case (Either) para a resposta HTTP: erro esperado
 * vira o envelope padrão via `errors`; sucesso define o status e retorna o valor
 * (sem corpo em 204, mesma convenção de sempre).
 */
export function respond<E extends string, R>(
  set: StatusSetter,
  result: Either<E, R>,
  errors: Record<E, HttpError>,
  successStatus = 200
) {
  if (!result.ok) return fail(set, errors[result.error]);
  set.status = successStatus;
  if (successStatus === 204) return;
  return result.value;
}
