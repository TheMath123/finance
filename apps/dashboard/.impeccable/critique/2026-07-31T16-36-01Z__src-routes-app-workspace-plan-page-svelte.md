---
target: tela de assinatura/planos do workspace
total_score: 16
max_score: 40
na_heuristics:
p0_count: 2
p1_count: 2
timestamp: 2026-07-31T16-36-01Z
slug: src-routes-app-workspace-plan-page-svelte
---

Method: dual-agent (A: aeb573d9f27dcf65b · B: a939d782811869fe4)

## Design Health Score

| #         | Heurística                                      | Nota      | Ponto-chave                                                                                                                                                  |
| --------- | ----------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1         | Visibilidade do status do sistema               | 1/4       | Sem loading/pending no submit do checkout nem do portal — confirmado no código: nenhum `$state` de `submitting` controla os botões em nenhum dos dois forms. |
| 2         | Correspondência sistema/mundo real              | 2/4       | Segundo `<select>` expõe combinações cruas de intervalo de cobrança do Stripe em vez de linguagem comercial.                                                 |
| 3         | Controle e liberdade do usuário                 | 2/4       | Assinante ativo só tem "Gerenciar assinatura" (redirect ao Portal) — sem comparar outros planos dentro do próprio app.                                       |
| 4         | Consistência e padrões                          | 3/4       | Reusa `Card`/`Button` do design system corretamente; os dois `<select>` nativos são um padrão ad hoc sem paralelo em nenhuma outra tela.                     |
| 5         | Prevenção de erros                              | 1/4       | Nenhuma confirmação/recapitulação do que será cobrado antes do redirect externo ao Stripe — clique único, sem volta.                                         |
| 6         | Reconhecimento em vez de lembrança              | 1/4       | Usuário memoriza os limites do Free (card de cima) enquanto escolhe às cegas no dropdown de baixo, que não mostra limites/features do plano-alvo.            |
| 7         | Flexibilidade e eficiência de uso               | 2/4       | Caminho único funciona, mas o dropdown é fricção desnecessária pra um catálogo de 3 planos.                                                                  |
| 8         | Estética e design minimalista                   | 2/4       | Minimalismo que corta informação decisória, não só ruído.                                                                                                    |
| 9         | Ajuda a reconhecer/diagnosticar/recuperar erros | 1/4       | `form?.message` (linha 54) é texto vermelho solto no topo da página, desconectado de qual ação (`checkout` ou `portal`) falhou.                              |
| 10        | Ajuda e documentação                            | 1/4       | Nenhum link pra termos, FAQ de cobrança, ou explicação do Customer Portal.                                                                                   |
| **Total** |                                                 | **16/40** | **Poor**                                                                                                                                                     |

## Design Specificity Verdict

**LLM assessment**: Genérica, facilmente intercambiável com qualquer SaaS. Nenhum elemento na tela só faria sentido para _este_ produto. Os dados que tornariam a tela específica (`PlanView.features`, `PlanView.trialDays`, `PlanView.limits`) já existem no backend e chegam prontos — só aparecem no card do plano _atual_ (Free), nunca no momento de decisão de compra.

**Deterministic scan**: `detect.mjs --json` sobre o arquivo devolveu `[]` (exit 0, scan limpo) — zero findings automáticos. Isso não significa "sem problemas": a leitura manual do código confirmou mecanicamente três pontos que um scanner de acessibilidade robusto tipicamente capturaria e este não cobre — (1) os dois `<select>` (linhas 99-107 e 109-118) sem `<label for>`/`aria-label` associado; (2) botões usando o variant default do `Button` (`h-8`, 32px) e selects em `h-9` (36px), ambos abaixo do alvo de toque de 44px; (3) nenhum callback em `use:enhance` alternando estado de `submitting` nos dois forms (`?/checkout` e `?/portal`). O array vazio do CLI é, portanto, uma lacuna de cobertura do scan, não uma confirmação de qualidade.

**Visual overlays**: indisponíveis nesta sessão — não há tool de automação de navegador exposta, então não foi possível injetar o detector no DOM ao vivo nem gerar overlay visível no browser. A análise seguiu com o scan CLI estático + a screenshot fornecida por você. Na inspeção estática da screenshot: hierarquia tipográfica de 3 níveis está presente (título de página > título de card > corpo), espaçamento entre os dois cards é claro, e nenhum indicador de status depende só de cor sem texto de apoio — mas o texto secundário (limites do plano, status) tem contraste visivelmente mais baixo que o texto principal, candidato a checagem formal de contraste WCAG AA.

## Overall Impression

A tela funciona, mas não convence. O maior problema não é estético — é estrutural: ela trata uma decisão de compra (a mais importante da jornada de um SaaS) com o mesmo componente genérico (`<select>`) usado pra qualquer formulário administrativo, escondendo justamente a informação (preço, features, limites, trial) que faria alguém decidir pagar. Com o catálogo pago confirmado em no máximo 3 planos, a maior oportunidade é simples: substituir os dois dropdowns por 3 cards de plano lado a lado, com preço e principais benefícios visíveis sem nenhum clique — isso resolve de uma vez a especificidade, a hierarquia visual, a carga cognitiva e metade das heurísticas fracas da tabela acima.

## What's Working

1. Reuso consistente do design system (`Card`, `Button`, tokens de cor) — a tela não quebra a linguagem visual do resto do dashboard.
2. Exibição compacta e legível dos limites do plano atual no card "Free" (`1 workspace(s) · 5 membro(s) · 10 fórmula(s)`).
3. Tratamento de erro pelo menos existe e usa mensagem específica do backend (não é um catch-all genérico) — só está mal posicionado, não ausente.

## Priority Issues

**[P0] Dropdowns em vez de comparação de planos**

- **Why it matters**: com um catálogo confirmado de no máximo 3 planos pagos, esconder as opções atrás de dois `<select>` empilhados é o oposto do ideal — o usuário não vê preço, features nem limites antes de decidir, e precisa abrir/fechar repetidamente pra montar uma comparação mental. É a causa raiz de 6 das 8 falhas do checklist de carga cognitiva e da nota baixa em "reconhecimento" e "prevenção de erros".
- **Fix**: substituir os dois dropdowns por uma grade de até 3 cards de plano lado a lado (empilhando em mobile), cada um mostrando preço, principais limites/features e um botão "Assinar" próprio; destacar visualmente o preço padrão/recomendado (`isDefault`) em vez de escondê-lo como atributo `selected` invisível.
- **Suggested command**: `/impeccable layout`

**[P0] Selects sem label associado + alvos de toque abaixo de 44px**

- **Why it matters**: nenhum dos dois `<select>` (linhas 99-107, 109-118) tem `<label for>`/`aria-label`/`aria-labelledby` — leitor de tela não anuncia o propósito do campo, violação direta de WCAG 1.3.1/4.1.2. Além disso, botões (`h-8` = 32px) e selects (`h-9` = 36px) ficam abaixo do alvo de toque mínimo de 44px — o próprio PRODUCT.md fixa WCAG AA como padrão mínimo confirmado, e esta tela não cumpre.
- **Fix**: associar `<Label>` visível a cada campo (`for`/`id`), e aumentar a altura/padding dos elementos interativos desta tela para ≥44px.
- **Suggested command**: `/impeccable audit`

**[P1] Zero reassurance no momento de maior risco percebido**

- **Why it matters**: é uma tela de decisão de compra — nenhuma menção a trial (mesmo quando `PlanView.trialDays > 0`), cancelamento, ou segurança do processamento via Stripe aparece antes do botão "Assinar". Isso deixa o momento de maior ansiedade do usuário sem nenhum contrapeso de confiança.
- **Fix**: mostrar um recap do que será cobrado (plano + preço + intervalo) e, quando aplicável, "X dias grátis antes da primeira cobrança" e "cancele quando quiser" perto do CTA.
- **Suggested command**: `/impeccable clarify`

**[P1] Sem estado de loading durante o submit**

- **Why it matters**: confirmado no código — nenhum dos dois forms (`?/checkout`, linhas 98-121; `?/portal`, linhas 83-85) usa o callback de `use:enhance` pra alternar estado local durante a request. O clique em "Assinar" ou "Gerenciar assinatura" não dá nenhum feedback visual enquanto o redirect externo é preparado, abrindo risco de duplo clique e ansiedade.
- **Fix**: usar o callback de `use:enhance` para setar um `$state(submitting)` que desabilita o botão e mostra um spinner/texto de "Redirecionando..." durante a request.
- **Suggested command**: `/impeccable harden`

**[P2] Mensagem de erro desconectada do contexto**

- **Why it matters**: `form?.message` (linha 53-55) aparece como texto vermelho solto no topo da página inteira, sem indicar qual dos dois forms (checkout ou portal) falhou nem sugerir um próximo passo.
- **Fix**: posicionar a mensagem de erro próxima ao form que a gerou, com uma ação de retry clara.
- **Suggested command**: `/impeccable clarify`

## Persona Red Flags

**Alex (power user, decide pelo workspace/família)**: vai abrir e fechar os dois `<select>` várias vezes tentando montar mentalmente uma tabela comparativa de preço x plano — fricção que ele reclamaria em voz alta ("por que não me mostra os 3 planos lado a lado de uma vez?"). Nenhum atalho ou visão condensada existe pra quem já sabe o que quer.

**Usuário Free avaliando se vale pagar** (persona específica do produto — decisor de upgrade, PRODUCT.md): não vê o que ganha (nenhuma feature/limite do plano-alvo aparece antes do "Assinar"), não vê se há trial, não vê "cancele quando quiser" — a tela não reduz o risco percebido de comprometer o cartão, que é exatamente a função que deveria cumprir numa tela de conversão.

## Minor Observations

- "R$ 0,00 / mês" no card Free é ruído — plano gratuito não precisa de "preço" explícito.
- Pluralização mecânica ("workspace(s) compartilhado(s)", "membro(s)", "fórmula(s) salva(s)") é uma gambiarra de i18n visível, destoando de um produto que quer parecer maduro o suficiente pra cobrar de clientes reais.
- Descrição "Escolha um plano pago pra desbloquear mais limites" é vaga — não diz quais limites.
- O preço marcado como `isDefault` só é sinalizado pelo atributo HTML `selected`, invisível até o usuário abrir o dropdown.
- Assinante ativo não vê outros planos no app (só "Gerenciar assinatura") — oportunidade de upsell perdida, mas de impacto menor que os itens acima.

## Questions to Consider

1. Se o catálogo pago vai ter no máximo 3 planos para sempre, por que essa tela ainda está desenhada como se precisasse escalar para uma lista longa em dropdown?
2. Esta é a última tela antes do usuário decidir gastar dinheiro de verdade — o que nela hoje faz alguém confiar _mais_ em vez de menos?
3. `PlanView.features` e `PlanView.trialDays` já existem e chegam prontos do backend — por que a UI de checkout não usa nada disso para vender o upgrade?
