# Documento de Especificação Técnica e Copywriting
**Landing Page do Produto: Marcelus App**

> **Objetivo Principal:** Este documento serve como guia para a implementação da nova Landing Page (`marcelus.app/pt`). O foco é resolver os problemas de verificação do OAuth do Google (clareza do propósito e correspondência de nome do app), otimizar o SEO e estruturar a interface de precificação dinâmica via API.

## 1. Requisitos Críticos de Compliance (Google OAuth)
* **Nome do Aplicativo:** O nome "Marcelus" deve estar explícito na primeira dobra (Hero Section) e corresponder exatamente ao configurado na tela de consentimento do Google.
* **Clareza de Propósito:** A finalidade do aplicativo (organização financeira pessoal e compartilhada) deve estar clara nos primeiros textos lidos pelo usuário.
* **Rodapé Obrigatório:** Devem constar links diretos e funcionais para a *Política de Privacidade* e para os *Termos de Serviço*.

## 2. Estrutura de Conteúdo e Copywriting

### A. Menu de Navegação (Header)
* **Elementos:** Logo "Marcelus" visível, Links de navegação (Funcionalidades, Para Famílias, Preços, Blog), e botão principal (Entrar / Criar Conta).

### B. Hero Section (Primeira Impressão)
* **Headline (H1):** Conheça o Marcelus: O seu app de organização financeira pessoal e compartilhada.
* **Sub-headline (H2):** Chega de abandonar planilhas no meio do mês. O Marcelus é o ecossistema inteligente que organiza seu dinheiro através do WhatsApp, aplicativo móvel ou painel web. Lance gastos conversando com nossa IA, divida contas com sua família e tenha o controle real do seu futuro.
* **CTA:** Comece a usar de graça. (Com subtítulo: Não exige cartão de crédito. Cancele quando quiser).
* **Diretriz Visual:** Layout "Split Screen". Exibir celular com simulação de conversa no WhatsApp ao lado de um notebook exibindo o Dashboard Web.

### C. Identificação da Dor do Usuário
* **Título:** A gente sabe, lançar gastos em aplicativo dá preguiça. E muito trabalho.
* **Texto:** A maioria dos apps de finanças exige que você abra o aplicativo, escolha a conta, procure a categoria e confirme. Esse atrito é o motivo pelo qual você desiste. O Marcelus inverte a lógica, nós nos encaixamos no seu hábito. Você já passa o dia no WhatsApp, certo? Então é lá que sua gestão financeira acontece.

### D. Funcionalidades (SEO)
* **IA no WhatsApp:** *Mandou, registrou. Simples assim.* Envie uma mensagem como "Paguei 50 no mercado hoje" no WhatsApp. A inteligência artificial do Marcelus entende o contexto, categoriza, seleciona a data e atualiza seu painel na mesma hora.
* **Finanças Compartilhadas:** *Dinheiro não precisa ser tabu. Compartilhe a visão, não a senha.* Crie Workspaces para gerenciar as finanças da sua casa. Defina papéis e saiba exatamente quem pagou o quê, tudo em um só lugar.
* **Fórmulas e Personalização:** *Suas regras, suas métricas.* Esqueça relatórios engessados. Monte indicadores customizados, como "Quanto sobra após pagar o aluguel", e fixe na sua tela inicial.

### E. Segurança e Transparência
* **Título:** Seus dados seguros, privados e só seus.
* **Texto:** O app Marcelus foi criado com a LGPD como pilar principal. Suas informações são criptografadas. Você pode exportar seus dados em um clique ou excluir sua conta definitivamente. O Marcelus utiliza integrações oficiais, como o Login do Google, garantindo a máxima segurança no acesso.

## 3. Diretrizes para a Seção de Preços (Dinâmica)
> **Atenção Front-end:** Os valores numéricos dos planos não devem ser fixados no código (hardcoded). Eles devem ser consumidos da API de assinaturas já existente.

* **UI/UX:** Implementar *skeleton loaders* nos cards de preços durante a requisição da API para evitar Layout Shift (CLS).
* **Layout dos Cards:**
    * **Free:** Destacar 1 Workspace, 3 membros, 10 fórmulas.
    * **Plus:** Destacar Trial de 15 dias, 2 Workspaces, 5 membros, 20 fórmulas.
    * **Pro:** Destacar IA Liberada (Bot do WhatsApp), 3 Workspaces, 10 membros, 50 fórmulas.
    * **Enterprise:** Exibir modelo sob demanda (workspaces e membros adicionais).
* **Ancoragem de Preços:** O front-end deve receber e exibir as tags de desconto ao alternar entre mensal, semestral e anual, calculando a economia de forma visual para incentivar a assinatura anual.

## 4. Rodapé (Footer)
Garantir que os links obrigatórios estejam presentes e acessíveis:
* Política de Privacidade
* Termos de Serviço
* Contato e Suporte
* Copyright: © 2026 Marcelus App. Todos os direitos reservados.
