import { Elysia } from "elysia";

/**
 * onError global (spec: Tratamento de erros): exceção inesperada gera log
 * estruturado com request-id e resposta 500 sanitizada — nunca vaza stack.
 * Erros esperados não passam por aqui (são Either mapeado nas rotas).
 */
export const errorHandler = new Elysia({ name: "error-handler" }).onError(
  { as: "global" },
  ({ code, error, set, request }) => {
    const requestIdHeader = set.headers["x-request-id"];
    const requestId = typeof requestIdHeader === "string" ? requestIdHeader : "unknown";

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: { code: "not_found", message: "Rota não encontrada." } };
    }
    if (code === "PARSE") {
      set.status = 400;
      return { error: { code: "invalid_json", message: "Corpo da requisição não é JSON válido." } };
    }

    console.error(
      JSON.stringify({
        level: "error",
        scope: "http",
        event: "unhandled_error",
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        message: error instanceof Error ? error.message : String(error),
        ts: new Date().toISOString(),
      }),
    );
    set.status = 500;
    return {
      error: { code: "internal_error", message: "Erro interno. Tente novamente.", requestId },
    };
  },
);
