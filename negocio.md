# Marcelus — Contexto de Negócio

> Este documento descreve o produto do ponto de vista de negócio: o que ele é, pra quem é, e o que o diferencia. Para especificação técnica completa (arquitetura, modelos de dados, regras de negócio detalhadas), ver `spec.md`.

## O que é

Marcelus é um ecossistema de organização financeira pessoal e compartilhada, composto por **app mobile**, **dashboard web** e um **chatbot no WhatsApp** — todos consumindo o mesmo backend. A proposta central é reduzir o atrito de registrar e entender a própria vida financeira: o usuário lança uma transação mandando uma mensagem de WhatsApp ("gastei 50 no mercado no nubank"), abrindo o app, ou pelo navegador, e o sistema interpreta, categoriza e organiza tudo automaticamente.

## Contexto de negócio

### O problema

Apps de finanças pessoais no Brasil (Mobills, Organizze, e a extinta GuiaBolso) resolvem parte do problema — categorização e relatórios — mas esbarram no mesmo obstáculo de sempre: **lançar a transação dá trabalho**. Abrir o app, escolher categoria, conta, cartão, confirmar — esse atrito é a principal causa de abandono desse tipo de produto. Além disso, a maioria trata "finanças" como algo estritamente individual, exigindo produtos separados (ou nenhuma solução boa) para famílias que querem visibilidade compartilhada, ou para dividir contas entre amigos.

### A aposta do produto

1. **WhatsApp como canal primário de entrada de dados.** O brasileiro já vive dentro do WhatsApp — em vez de competir por mais um app pra abrir, o Marcelus se encaixa no hábito existente. Mandar uma mensagem é mais rápido que preencher um formulário.
2. **Finanças compartilhadas como cidadão de primeira classe**, não um adendo. Workspaces (pessoal, família, e futuramente empresarial) com papéis granulares (dono, admin, membro, visualizador) resolvem o caso real de casais, famílias com filhos acompanhando o orçamento, ou pequenos negócios.
3. **Uma camada social entre usuários da própria plataforma** — transferir dinheiro entre contas de usuários diferentes e dividir despesas com amigos — que nenhum concorrente direto de finanças pessoais brasileiro oferece de forma nativa.
4. **IA usada com disciplina de custo**, não como enfeite de marketing: um pipeline em camadas (regra determinística → modelo barato → modelo maior só quando necessário) mantém a categorização e a interpretação de linguagem natural baratas o bastante pra sustentar um plano gratuito de verdade.

### Público-alvo

- Indivíduos que quer controle financeiro sem fricção no dia a dia.
- Casais e famílias que precisam de visibilidade e controle compartilhados sobre o orçamento (inclusive dando acesso só-leitura a filhos).
- Grupos de amigos que dividem despesas recorrentes (viagens, contas, aluguel) e hoje resolvem isso em planilha ou aplicativo à parte (Splitwise) sem nenhuma integração com o resto da vida financeira.
- Futuro (M5): pequenas empresas que precisam de contas por setor — mesma base de workspaces, papéis e IA, extensão natural do produto.

## Como funciona (visão de produto)

- **Lançar uma transação** pode acontecer de três formas equivalentes: mensagem no WhatsApp (privado ou em grupo vinculado a um workspace de família), tela do app, ou dashboard web — sempre caindo no mesmo workspace e sujeito às mesmas regras.
- **Visão mensal com projeção real**: não é só "quanto eu gastei", mas "quanto vai sobrar" — soma saldo das contas, receitas recorrentes previstas, subtrai parcelas futuras de cartão, despesas recorrentes e uma estimativa de gastos variáveis calculada pelo histórico via IA.
- **Fatura de cartão tratada como um agrupador de verdade**: competência calculada pelo dia de fechamento, parcelamento distribuído automaticamente pelas próximas faturas, imutabilidade depois de paga (correção via estorno, nunca editando o passado).
- **Camada social**: enviar dinheiro para outro usuário da plataforma (com aceite do lado de quem recebe, e "contato confiável" para automatizar as próximas vezes) e dividir uma despesa entre participantes — com ou sem conta na plataforma.

## Diferenciais (o que nenhum concorrente direto oferece junto)

- **Chatbot financeiro no WhatsApp com IA**, interpretando linguagem natural variada ("50 no mercado", "paguei 120 de luz", "recebi salário") sem exigir formato rígido, com guardrails de escopo e custo (nunca vira um chatbot genérico, nunca estoura orçamento de tokens).
- **Import de CSV de fatura/extrato bancário** com detecção automática de formato (delimitador, encoding, colunas — nunca um parser hardcoded por banco), deduplicação (nunca lança a mesma transação duas vezes) e reconhecimento de parcelamento, populando automaticamente as faturas futuras.
- **Transferência entre usuários da plataforma** com fluxo de aceite e "contato confiável" (pessoas de alta confiança, como cônjuge, recebem automaticamente sem precisar confirmar toda vez).
- **Split de despesas** com confirmação em duas pontas (quem pagou confirma o recebimento do reembolso) — participantes podem ou não ter conta na plataforma.
- **Calculadora de fórmulas personalizadas**: o usuário monta expressões próprias referenciando saldos, categorias, contas e cartões (ex.: "quanto sobra depois de tirar aluguel e cartão"), fixáveis na tela inicial — nenhum concorrente oferece esse nível de customização sem virar planilha.
- **Widget de tela inicial (Android)** com o resumo financeiro do workspace ativo, sem precisar abrir o app.
- **Anexo de comprovante direto pela foto mandada no WhatsApp**, associado automaticamente à transação mais recente.
- **Multiplataforma de verdade**: mobile, web (responsivo, inclusive para quem não quer instalar app) e WhatsApp compartilham o mesmo backend e as mesmas regras de negócio — nenhum cliente é cidadão de segunda classe.
- **LGPD como parte do produto, não como nota de rodapé**: export de dados a qualquer momento, exclusão de conta com cascade correto, anonimização em workspaces compartilhados.

## Modelo de monetização

Estrutura de planos por workspace, já com cobrança real via Stripe (checkout e portal de cliente hospedados):

- **Free**: uso individual/casal com limites generosos (1 workspace compartilhado por usuário, até 5 membros).
- **Premium**: sem os limites do free, preços configuráveis (mensal/semestral/anual, com parcelamento), trial por tempo.
- Plataforma administrável por um painel de superadmin (planos, preços, feature flags, métricas de uso, guardrails de IA) — permite testar e ajustar a monetização sem precisar de deploy de código para toda mudança comercial.
- **Futuro (M5)**: plano/workspace empresarial, com contas por setor — mesma base técnica, novo segmento de mercado.

## Estado atual

Produto com backend, app mobile e dashboard web completos e em produção para o fluxo principal: autenticação, workspaces compartilhados, CRUD financeiro completo, faturas de cartão com parcelamento, chatbot no WhatsApp com IA (em modo de desenvolvimento — aguardando aprovação de App Review da Meta para sair do modo restrito a testadores), camada social (transferências e splits), anexo de comprovante, calculadora de fórmulas, e cobrança via Stripe já integrada. Import de CSV de fatura entrou como feature experimental (atrás de feature flag) mais recentemente. Próximo horizonte de produto: workspaces empresariais (M5).
