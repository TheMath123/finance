# Aprovação Meta App Review — permissão `whatsapp_business_messaging`

**Status:** ⚪ Aguardando terceiro (Meta) — questionário do App Review
começado em 2026-07-20, preenchimento postergado até termos mais detalhes.

## Contexto

Hoje o número de WhatsApp do projeto roda em **Development Mode** (App
não publicado no App Review da Meta). Nesse modo, o webhook só recebe
mensagem de números explicitamente cadastrados como testadores no Meta
Business Manager — funciona pra validar o código ([[m2-06-whatsapp-webhook-chatbot]],
[[m2-05-whatsapp-vinculo-otp]], [[m3-05-anexo-comprovante-whatsapp]]), mas
**não pra usuário real nenhum fora da lista de teste**.

Pra qualquer pessoa poder vincular o WhatsApp e usar o chatbot, o app
precisa ser aprovado no App Review da Meta pra permissão
`whatsapp_business_messaging` (enviar mensagem, subir/baixar mídia,
registrar número).

## Por que entra em `validations/` e não em `backlog/`

Diferente do `backlog/` (funcionalidade ainda não implementada, ou
decidida pra depois), aqui o código já está pronto, testado e — pelo que
sabemos até agora — funcionando (M2-06 validado com mensagem real de
testador; M3-05 com código pronto, storage real provado, faltando só
teste real com o número de testador). O que falta é **liberação de
terceiro** (Meta aprovar o App Review) antes de considerar essas
features prontas pra qualquer usuário — e depois da aprovação, alguém
precisa **revalidar manualmente** com um número que não esteja na lista
de testadores, já que o comportamento de Development Mode vs Live Mode
pode diferir (rate limits, templates de mensagem exigidos pra iniciar
conversa fora da janela de 24h, etc.).

## O que precisa ser revalidado depois da aprovação

- [ ] Vínculo de número (M2-05) com um número **real, fora da lista de
      testadores** — confirmar que o fluxo de OTP funciona igual.
- [ ] Registro de transação por texto (M2-06) com esse mesmo número —
      confirmar que a resposta de confirmação chega (fora do Development
      Mode, mensagens fora da janela de 24h desde o último contato do
      usuário podem exigir template pré-aprovado, não texto livre).
- [ ] Anexo de comprovante via foto (M3-05) com esse número.
- [ ] Checar se o Meta exige algum texto de "opt-in"/consentimento
      explícito do usuário antes de mandar a primeira mensagem em Live
      Mode (varia por política — confirmar no painel depois da aprovação).

## Próximo passo

Retomar o preenchimento do questionário do App Review (descrição de uso
da permissão + gravação de tela demonstrando os 3 fluxos acima) quando o
usuário tiver mais detalhes/tempo. Ver rascunho de texto já discutido na
sessão de 2026-07-20 (não salvo em arquivo — só na conversa).
