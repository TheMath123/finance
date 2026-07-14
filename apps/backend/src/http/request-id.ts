import { Elysia } from "elysia";

/**
 * Request-id por requisição (spec: Observabilidade): vai no header `x-request-id`
 * de toda resposta e em todo log de erro — correlação ponta a ponta.
 */
export const requestId = new Elysia({ name: "request-id" }).derive(
  { as: "global" },
  ({ set }) => {
    const id = crypto.randomUUID();
    set.headers["x-request-id"] = id;
    return { requestId: id };
  },
);
