# 05 — Enforcement de limite de plano (workspace free/premium)

**Status:** ⚪ Bloqueada — depende do M2.

## Contexto

Campo `plan` já existe no schema (`packages/db/src/schema/workspace.ts`, enum
free/premium), mas nada aplica o limite ainda. Não faz diferença prática hoje porque
não existe rota pra criar um segundo workspace ou convidar membro — isso só chega no
M2, junto com compartilhamento.

## Próximo passo

Não fazer nada agora. Retomar quando a rota de criar/convidar workspace adicional
existir (M2) — nesse momento, checar limite de membros (5) e de workspaces
compartilhados antes de liberar a ação.
