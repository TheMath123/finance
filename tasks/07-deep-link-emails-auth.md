# 07 — Recuperação de senha e verificação de e-mail (histórico: deep link → código)

**Status:** 🟢 Concluída — abordagem trocada.

## Contexto

Esta task originalmente descrevia deep links (`mobile://reset-password?token=...`,
`mobile://verify-email?token=...`) para os e-mails de auth. Essa abordagem foi
**abandonada**: clientes de e-mail (Gmail/Outlook/etc.) removem `<a href>` com
esquema de URI customizado como segurança, então o botão chegava sem link
funcional.

## O que existe hoje

- **Reset de senha**: fluxo de 3 passos com **código numérico de 6 dígitos**
  exibido como texto no e-mail (sem link): e-mail → código (`POST
  /auth/verify-reset-code`, não consome o código) → nova senha + confirmação
  (`POST /auth/reset-password`, revalida e consome o código). Rate limit
  compartilhado `reset-code:${email}` (5/15min) entre os dois endpoints;
  resposta genérica `invalid_code` em ambos, para não criar oráculo de
  existência de conta. Telas: `(auth)/forgot-password.tsx` →
  `(auth)/reset-password.tsx` → `(auth)/new-password.tsx`.
- **Verificação de e-mail**: continua com token opaco (256-bit, hash SHA-256,
  TTL 24h, single-use) — mecanismo não mudou, só o rótulo virou "Código" na UI
  e o e-mail mostra o valor como texto em vez de link. Tela movida para
  `(app)/verify-email.tsx` (fora do grupo `(auth)`, pois só é alcançável por
  um usuário já autenticado — o registro já loga automaticamente). Acesso via
  banner "E-mail não verificado" em `(app)/profile.tsx`.
- Nenhum código monta mais `mobile://...` ou usa `APP_URL`/deep link — campo
  `appUrl` (backend) removido por estar morto.

## Pendência

Nenhuma. Sem deep link, não há mais "testar abertura em device" a fazer — o
fluxo é 100% dentro do app autenticado (verificação) ou 100% manual (código
copiado do e-mail para o campo).
