# M2-07 — Pipeline de IA: interpretar/categorizar transações

**Status:** 🔵 Backlog — não iniciada.

## Contexto

Coração do M2 do ponto de vista de produto: registrar transação por
linguagem natural no chatbot + categorização automática no app. O spec já
fechou a arquitetura em detalhe (seção "Arquitetura do agente de IA — fechada
em 2026-07-13") especificamente pra economizar tokens — **seguir esse desenho
à risca**, não improvisar um RAG.

## Escopo

1. **Camada 0 — determinística (custo zero)**: parser regex/heurística pra
   formatos óbvios ("50 mercado nubank"); cache de categorização
   (`description_normalized` → categoria já vista, campo que já existe na
   `Transaction` desde o M1 especificamente pra isso).
2. **Camada 1 — modelo pequeno roteador**: classifica intenção (registrar
   transação | pergunta analítica | fora de escopo) + faz parsing via
   **structured outputs** (JSON validado por schema Zod). Maioria das
   mensagens resolve aqui.
3. **Camada 2 — agente com tool use**: só perguntas analíticas complexas.
   Tools retornam **números agregados via SQL** (`get_monthly_summary`,
   `sum_by_category`, `get_invoice_total`, `get_available_projection`) —
   nunca listas de transações cruas.
4. **Prompt caching**: system prompt (persona, guardrails, tools) congelado
   com `cache_control`; nada volátil (data/hora, nome do usuário) no system
   prompt.
5. **Guardrails de custo**: recusar (de forma amigável) perguntas fora do
   domínio financeiro; limite de tokens por requisição e por usuário;
   `max_tokens` baixo nas respostas do chatbot; respostas curtas por design.
6. **Fallback determinístico**: se a IA estiver indisponível ou o orçamento
   de tokens estourar, cair pra heurística/média histórica em vez de travar.
7. Mesma categorização automática é reaproveitada no app (não só no chatbot).

## Dependências

Nenhuma técnica bloqueante, mas o valor só aparece com
[[m2-06-whatsapp-webhook-chatbot]] rodando (é o consumidor principal da
camada 1/2). Reaproveita `description_normalized` já existente desde o M1.

## Próximo passo

Ler a seção "Arquitetura do agente de IA" do `spec.md` (linha ~166) antes de
começar — o desenho de camadas e o princípio "SQL é o retrieval" já estão
fechados, não é decisão em aberto.
