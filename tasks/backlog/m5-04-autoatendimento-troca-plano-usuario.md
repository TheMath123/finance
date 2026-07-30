# M5-04 (backlog) — Autoatendimento: usuário comum vê e troca o próprio plano

**Status:** ⚪ Não iniciada — só planejamento, conforme pedido do usuário na
sessão do M5-03 ("quero que já faça o plano... mas vamos priorizar as
alterações de cima"). Prioridade menor que o M5-03 (modelo de dados de
preços/trial/feature-lock), que foi implementado primeiro.

## Contexto

Hoje (pós M5-02/M5-03) toda a gestão de plano é 100% admin-only:
`GET/POST /admin/plans`, `PATCH /admin/workspaces/:id/plan` — todos atrás de
`requireSuperadmin`. Não existe nenhum endpoint não-admin para o usuário
comum ver o próprio plano/limites/recorrência, nem para trocar de plano
sozinho. No mobile, `WorkspaceInfo.planId` e `WorkspaceSummary.plan` (a key)
já existem no tipo mas não são exibidos em nenhuma tela — confirmado por
busca exaustiva em `apps/mobile/src` (nenhuma rota `plan`/`subscription`/
`assinatura`/`upgrade` existe hoje).

## O que falta (alto nível)

### Backend

- `GET /plans` — autenticado (não admin), lista só planos `isActive`, sem
  os campos administrativos (ou os mesmos campos de `PlanView`, já que não
  há nada sensível ali). Reaproveita `deps.repos.plan.listActive()`.
- `PATCH /workspaces/:id/plan` — troca de plano pelo dono do workspace
  (`role === 'owner'`, mesmo padrão de autorização de outras rotas de
  workspace). Duas perguntas em aberto que precisam de decisão do usuário
  antes de implementar:
  1. **Trocar para um plano pago sem gateway real** — faz sentido? Provável
     resposta: só permitir troca livre entre planos com `prices` todas
     `priceCents === 0` (ou seja, entre "free"/planos gratuitos); trocar
     para um plano pago ficaria bloqueado até existir checkout de verdade
     (M5-03 já deixou o comentário "hoje é a única forma de mudar plano
     fora do fluxo de cobrança" em `set-workspace-plan.ts`).
  2. **Trial self-service** — o usuário pode iniciar o próprio trial de um
     plano pago sem pagar nada (via este endpoint), já que a M5-03 fez o
     trial ser só baseado em tempo, sem depender de pagamento? Se sim, a
     lógica de calcular `trialEndsAt` a partir de `plan.trialDays` (hoje só
     em `set-workspace-plan.ts`, admin) precisa virar um helper reutilizado
     também aqui.
- Reaproveitar `resolveEffectivePlan`/`hasFeatureAccess`
  (`domain/services/resolve-effective-plan.ts`, M5-03) para uma futura rota
  `GET /workspaces/:id/plan` que devolva o plano **efetivo** (considerando
  trial vencido), não só o `planId` cru — é o que a tela do usuário deve
  exibir (mesma fonte de verdade dos limites reais aplicados).

### Dashboard (fora do namespace `/saas/*`)

- Nova tela de "assinatura" nas configurações do workspace (perto de
  `apps/dashboard/src/routes/(app)/workspace/settings/`), reaproveitando o
  padrão visual dessas páginas: card com plano atual + recorrência + trial
  (se houver) + limites, e um `Dialog` pra trocar entre os planos elegíveis
  (provavelmente só os gratuitos, ver pergunta 1 acima).

### Mobile

- Nenhuma tela equivalente existe hoje. Seguir os dois padrões já
  confirmados no código:
  - Parte read-only (plano atual, preço, recorrência, limites): molde de
    `apps/mobile/src/app/(app)/variable-expense.tsx` — `useQuery`
    (`@tanstack/react-query`), `Card` de destaque central + lista de
    `Card` por limite, sem nenhum form.
  - Ação de trocar de plano: molde de `apps/mobile/src/app/(app)/profile.tsx`
    (`Dialog`/`DialogContent` com uma lista de opções, não precisa de React
    Hook Form já que é seleção simples, não input de texto).
  - Nova rota sugerida: `apps/mobile/src/app/(app)/workspaces/[workspaceId]/plan.tsx`.
  - `apps/mobile/src/lib/workspace-api.ts` ganha as funções novas
    (`getPlan`/`listPlans`/`changePlan`), hoje inexistentes.

## Ordem sugerida (quando for priorizado)

1. Decidir com o usuário as duas perguntas em aberto (troca pra plano pago
   sem gateway, trial self-service).
2. Backend: `GET /plans`, `GET /workspaces/:id/plan` (efetivo), `PATCH
   /workspaces/:id/plan` (owner-only, com as regras decididas).
3. Testes de use-case novos.
4. Dashboard: tela de assinatura no workspace settings.
5. Mobile: `workspace-api.ts` + tela `plan.tsx` + link na tela de
   configurações do workspace/membros.
6. Validação (typecheck + testes + lint + build) + smoke test manual nas
   duas plataformas.

## Fora de escopo (continua sendo do M5-03/Stripe futuro)

Cobrança real, checkout, parcelamento de fato, cancelamento automático por
inadimplência — tudo isso continua dependendo de uma integração de gateway
de pagamento real, que é um milestone à parte, ainda não decidido pelo
usuário.
