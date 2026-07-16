# M2-03 — Enforcement de limite de plano (free/premium)

**Status:** 🔵 Backlog — não iniciada (retomada de [[../tasks/done/05-enforcement-plano|task 05 arquivada do M1]]).

## Contexto

Campo `plan` (`free`/`premium`, default `free`) já existe em
`packages/db/src/schema/workspace.ts`, mas nada aplica limite ainda — não
fazia diferença no M1 porque não existia rota pra criar workspace adicional
ou convidar membro. Com [[m2-02-workspaces-compartilhamento]] entregando essas
rotas, o enforcement passa a ser necessário de verdade.

## Escopo

- Checagem num único ponto da camada de service (spec: "um único ponto"):
  - **free**: no máximo 1 workspace compartilhado por usuário (além do
    `personal`) e até 5 membros por workspace compartilhado.
  - **premium**: sem limites.
- Valores como configuração (constantes/env), não espalhados pelo código.
- Erro claro quando o limite é atingido (`plan_limit_reached` ou similar, no
  padrão de erro já existente `{error:{code,message}}`).
- Cobrança/gateway de pagamento continua fora de escopo (spec: milestone
  futuro) — aqui só o *enforcement* do campo que já existe.

## Dependências

Depende de [[m2-02-workspaces-compartilhamento]] estar pronta (precisa das
rotas de criar workspace e convidar/adicionar membro pra ter o que limitar).

## Próximo passo

Implementar junto com `POST /workspaces` e `POST /workspaces/:id/invites` da
task M2-02 — não vale a pena implementar isolado antes de existir o que
checar.
