import { Elysia } from 'elysia';
import type { Logger } from '../infra/observability/logger';

/**
 * onError global (spec: Tratamento de erros): exceção inesperada gera log
 * estruturado com request-id e resposta 500 sanitizada — nunca vaza stack.
 * Erros esperados não passam por aqui (são Either mapeado nas rotas).
 */
export const errorHandler = (logger: Logger) =>
  new Elysia({ name: 'error-handler' }).onError(
    { as: 'global' },
    ({ code, error, set, request }) => {
      const requestIdHeader = set.headers['x-request-id'];
      const requestId =
        typeof requestIdHeader === 'string' ? requestIdHeader : 'unknown';

      if (code === 'NOT_FOUND') {
        set.status = 404;
        // warn (não error): rota errada não é falha do servidor, mas sem
        // isso fica impossível depurar um client batendo no path errado —
        // ninguém via nada nos logs quando isso acontecia.
        logger.warn(
          {
            scope: 'http',
            event: 'route_not_found',
            requestId,
            method: request.method,
            path: new URL(request.url).pathname,
          },
          'route_not_found'
        );
        return {
          error: { code: 'not_found', message: 'Rota não encontrada.' },
        };
      }
      if (code === 'PARSE') {
        set.status = 400;
        return {
          error: {
            code: 'invalid_json',
            message: 'Corpo da requisição não é JSON válido.',
          },
        };
      }

      logger.error(
        {
          scope: 'http',
          event: 'unhandled_error',
          requestId,
          method: request.method,
          path: new URL(request.url).pathname,
          err: error,
        },
        'unhandled_error'
      );
      set.status = 500;
      return {
        error: {
          code: 'internal_error',
          message: 'Erro interno. Tente novamente.',
          requestId,
        },
      };
    }
  );
