# M5-02 — Gestão de planos (preço + limites) no superadmin

**Status:** 🔵 Backlog (não iniciada — só a nota de escopo abaixo)

## Contexto

Levantado ao fechar o M4 (superadmin): a plataforma já tem o conceito de
plano no schema (`workspaces.plan`, enum `free`/`premium`), mas nada além
disso existe de verdade:

- Limites do plano `free` são uma constante hardcoded no código
  (`apps/backend/src/domain/services/plan-limits.ts`,
  `FREE_PLAN_LIMITS` — `maxOwnedSharedWorkspaces: 1`,
  `maxMembersPerWorkspace: 5`), com o comentário já dizendo que isso
  deveria ser "configuração, não código espalhado".
- Plano `premium` não tem limite nenhum definido nem cobrança real —
  hoje é só um valor de enum sem efeito prático (nenhum workspace vira
  `premium` de fato, não existe fluxo de upgrade).
- Não existe **preço/valor** associado a nenhum plano em lugar nenhum.
- Não existe tela nenhuma (superadmin ou usuário) pra ver ou gerenciar
  planos.

Mesma lógica do M4-08 (categorias padrão saíram de constante pra
tabela editável): faz sentido os planos e seus limites seguirem o
mesmo caminho — mas aqui tem também a dimensão de **preço/cobrança**,
que é decisão de produto (gateway de pagamento? cobrança recorrente?
mensal/anual?) e não foi discutida ainda.

## Escopo (a refinar antes de implementar)

- Tabela de planos (nome, preço, limites — provavelmente reaproveitando
  a mesma ideia de `platform_settings`/`default_categories` do M4:
  editável pelo superadmin, sem redeploy).
- Migrar `FREE_PLAN_LIMITS` da constante pra essa tabela.
- Definir limites reais do plano `premium` (hoje inexistentes).
- Decisão em aberto: cobrança de verdade (gateway de pagamento,
  assinatura recorrente) entra nesta fase ou fica pra depois — só
  cadastro de preço/limite já resolve a gestão, cobrança é feature à
  parte e bem maior.
- Tela de superadmin pra CRUD de planos (mesmo padrão visual das
  telas de M4-08/M4-09: lista + dialog).
- Decisão em aberto: onde/como o usuário final vê o próprio plano e
  os limites (tela de configurações da conta/workspace?).

## Critério de conclusão (a definir)

Ainda não especificado — esta nota registra o gap encontrado; falta
sessão de planejamento (igual ao processo usado pro M4) antes de virar
tasks executáveis.
