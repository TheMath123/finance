# 06 — Destino do módulo `bank` órfão no backend

**Status:** 🟢 Decidida (manter).

## Contexto

As 6 rotas (`GET/POST/PATCH/DELETE/archive/unarchive` de bank) ficaram órfãs depois da
decisão de 2026-07-15 de tirar a gestão manual de banco do app (conta/cartão agora
mandam `bankCode` direto, o backend resolve/cria o `Bank` por trás via
`findOrCreateBank`).

## Decisão

Manter as rotas no backend — custo de manutenção é baixo e podem ser úteis pro futuro
dashboard web (M4, gestão administrativa de bancos por workspace, ex. renomear "Nubank
pessoal" vs. "Nubank empresa" mesmo código). Não remover.

Nenhuma ação necessária — item fechado, só documentado aqui pra não ser reaberto sem
motivo numa auditoria futura.
