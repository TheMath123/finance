# M2-03 — Enforcement de limite de plano (free/premium)

**Status:** 🟢 Concluída (2026-07-16) — retomada de [[../tasks/done/05-enforcement-plano|task 05 arquivada do M1]].

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

## Implementação (2026-07-16)

- `domain/services/plan-limits.ts` (novo): único ponto de configuração —
  `FREE_PLAN_LIMITS.maxOwnedSharedWorkspaces = 1`,
  `FREE_PLAN_LIMITS.maxMembersPerWorkspace = 5`.
- `create-workspace.ts`: conta quantos workspaces não-pessoais o usuário
  **possui** (owner) e ainda estão em `free` — ser convidado pro workspace de
  outra pessoa não consome a cota de quem foi convidado, só de quem criou.
  `createWorkspace` passou a devolver `Either<WorkspaceError, Workspace>`
  (era `Workspace` puro) — rota HTTP e todos os call sites de teste
  atualizados.
- `create-invite.ts`: se o workspace alvo é `free`, recusa o convite quando já
  tem 5 membros. `accept-invite.ts` reforça a mesma checagem no aceite (defesa
  contra vários convites pendentes sendo aceitos em paralelo depois do check
  na criação — mesmo espírito do reset de senha revalidando no passo final).
- `premium`: sem limite nenhum — como cobrança é milestone futuro, hoje só dá
  pra virar `premium` via update direto no banco (não existe fluxo de
  upgrade); o enforcement já está pronto pra quando esse fluxo existir.
- Erro `plan_limit_reached` (409) adicionado ao `WorkspaceError`/
  `WORKSPACE_ERRORS` — superfícia automaticamente no app via
  `ApiError.message` (forms de criar workspace/convite já exibem isso, sem
  precisar de mudança no mobile).
- Testes novos em `workspace.test.ts`: segundo workspace compartilhado
  recusado, sexto membro recusado (com os 5 primeiros aceitos), e workspace
  `premium` sem nenhum dos dois limites. Suite completa: **42/42 passando**.
