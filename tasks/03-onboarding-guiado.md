# 03 — Onboarding guiado

**Status:** 🔵 Backlog — decisão tomada (2026-07-15): manter o comportamento silencioso
atual por enquanto. Sem fluxo de boas-vindas dedicado por ora.

## Contexto

Hoje o onboarding é 100% silencioso: banco/conta/categorias padrão já são criados
automaticamente no registro (`apps/backend/src/application/use-cases/auth/register.ts`),
sem nenhuma tela guiando o usuário a personalizar isso. O usuário só cai direto no
Resumo com uma conta zerada pronta pra uso.

## Decisão pendente

Vale um fluxo de "boas-vindas" (2-3 telas) logo após o primeiro registro, convidando o
usuário a renomear a conta padrão, escolher o banco de verdade, criar o primeiro
cartão? Ou o comportamento silencioso atual já é suficiente pro M1 (usuário edita
tudo depois, normalmente, pelas telas que já existem)?

Não é bloqueante — é uma decisão de produto/UX, não uma lacuna técnica.

## Próximo passo

Perguntar ao usuário antes de começar a implementar (não faz sentido supor o escopo
exato de um fluxo de onboarding sem alinhar primeiro).
