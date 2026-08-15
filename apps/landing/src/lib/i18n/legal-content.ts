import type { Lang } from '../../params/lang';

export interface LegalSection {
	heading: string;
	paragraphs: string[];
}

export interface LegalPage {
	title: string;
	updatedAt: string;
	intro: string;
	sections: LegalSection[];
}

/**
 * Conteúdo de Privacidade/Termos — rascunho inicial baseado nos dados e
 * integrações reais do produto (Stripe, Meta/WhatsApp Cloud API, OpenRouter
 * para o assistente de IA, login Google, Microsoft Clarity para analytics,
 * hospedagem Cloudflare/Fly.io/Neon). NÃO É ACONSELHAMENTO JURÍDICO — precisa
 * de revisão por um advogado antes de publicar de verdade, especialmente
 * pelas obrigações da LGPD (dado financeiro é dado sensível).
 */
export const PRIVACY: Record<Lang, LegalPage> = {
	pt: {
		title: 'Política de Privacidade',
		updatedAt: 'Última atualização: agosto de 2026',
		intro:
			'Esta política explica quais dados o Marcelus coleta, por que coleta, com quem compartilha e quais direitos você tem sobre eles.',
		sections: [
			{
				heading: '1. Quais dados coletamos',
				paragraphs: [
					'Dados de cadastro: nome, e-mail, senha (armazenada com hash, nunca em texto puro) e, opcionalmente, número de WhatsApp.',
					'Dados financeiros que você registra: transações, contas, cartões, categorias, fórmulas personalizadas e comprovantes anexados.',
					'Dados de login social: se você entrar com o Google, recebemos nome, e-mail e foto de perfil da sua conta Google.',
					'Dados técnicos: endereço IP, tipo de dispositivo e navegador, usados por segurança (limite de tentativas de login, detecção de abuso).'
				]
			},
			{
				heading: '2. Por que usamos seus dados',
				paragraphs: [
					'Pra fornecer o serviço: guardar suas transações, calcular seus saldos e fórmulas, enviar notificações.',
					'Pra processar pagamentos de planos pagos, através do Stripe.',
					'Pra operar o assistente por WhatsApp, através da API oficial da Meta (WhatsApp Business Cloud API) e de modelos de IA acessados via OpenRouter.',
					'Pra melhorar o produto, através de métricas de uso agregadas (Microsoft Clarity).'
				]
			},
			{
				heading: '3. Com quem compartilhamos',
				paragraphs: [
					'Stripe (processamento de pagamento de assinaturas) — nunca temos acesso ao número completo do seu cartão.',
					'Meta (mensagens do WhatsApp) e provedores de IA via OpenRouter (respostas do assistente) — só quando você usa essas funções.',
					'Google (se você optar por entrar com sua conta Google).',
					'Provedores de infraestrutura (hospedagem e banco de dados) que processam os dados em nosso nome, sob contrato de confidencialidade.',
					'Nunca vendemos seus dados pra terceiros.'
				]
			},
			{
				heading: '4. Seus direitos (LGPD)',
				paragraphs: [
					'Você pode, a qualquer momento: confirmar se tratamos seus dados, acessá-los, corrigi-los, solicitar anonimização/exclusão, portar seus dados e revogar consentimentos.',
					'Você pode excluir sua conta e todos os dados associados diretamente pelas configurações do app, a qualquer momento.'
				]
			},
			{
				heading: '5. Segurança',
				paragraphs: [
					'Todo tráfego é criptografado (HTTPS). Senhas são armazenadas com hash. Aplicamos limite de tentativas e bloqueio temporário contra ataques de força bruta.'
				]
			},
			{
				heading: '6. Contato',
				paragraphs: [
					'Dúvidas sobre privacidade? Escreva pra privacidade@example.com (substituir pelo e-mail real antes de publicar).'
				]
			}
		]
	},
	en: {
		title: 'Privacy Policy',
		updatedAt: 'Last updated: August 2026',
		intro:
			'This policy explains what data Marcelus collects, why we collect it, who we share it with, and what rights you have over it.',
		sections: [
			{
				heading: '1. What data we collect',
				paragraphs: [
					'Account data: name, email, password (stored hashed, never in plain text) and, optionally, a WhatsApp number.',
					'Financial data you enter: transactions, accounts, cards, categories, custom formulas, and attached receipts.',
					'Social login data: if you sign in with Google, we receive your name, email, and profile picture from your Google account.',
					'Technical data: IP address, device and browser type, used for security (login rate limiting, abuse detection).'
				]
			},
			{
				heading: '2. Why we use your data',
				paragraphs: [
					'To provide the service: store your transactions, calculate balances and formulas, send notifications.',
					'To process payments for paid plans, through Stripe.',
					'To run the WhatsApp assistant, through Meta’s official WhatsApp Business Cloud API and AI models accessed via OpenRouter.',
					'To improve the product, through aggregated usage metrics (Microsoft Clarity).'
				]
			},
			{
				heading: '3. Who we share data with',
				paragraphs: [
					'Stripe (subscription payment processing) — we never have access to your full card number.',
					'Meta (WhatsApp messages) and AI providers via OpenRouter (assistant responses) — only when you use those features.',
					'Google (if you choose to sign in with your Google account).',
					'Infrastructure providers (hosting and database) that process data on our behalf, under confidentiality agreements.',
					'We never sell your data to third parties.'
				]
			},
			{
				heading: '4. Your rights',
				paragraphs: [
					'You can, at any time: confirm whether we process your data, access it, correct it, request anonymization/deletion, port your data, and revoke consent.',
					'You can delete your account and all associated data directly from the app settings, at any time.'
				]
			},
			{
				heading: '5. Security',
				paragraphs: [
					'All traffic is encrypted (HTTPS). Passwords are stored hashed. We apply rate limiting and temporary lockout against brute-force attacks.'
				]
			},
			{
				heading: '6. Contact',
				paragraphs: [
					'Questions about privacy? Write to privacy@example.com (replace with the real address before publishing).'
				]
			}
		]
	},
	es: {
		title: 'Política de Privacidad',
		updatedAt: 'Última actualización: agosto de 2026',
		intro:
			'Esta política explica qué datos recopila Marcelus, por qué los recopilamos, con quién los compartimos y qué derechos tienes sobre ellos.',
		sections: [
			{
				heading: '1. Qué datos recopilamos',
				paragraphs: [
					'Datos de registro: nombre, correo electrónico, contraseña (almacenada con hash, nunca en texto plano) y, opcionalmente, un número de WhatsApp.',
					'Datos financieros que registras: transacciones, cuentas, tarjetas, categorías, fórmulas personalizadas y comprobantes adjuntos.',
					'Datos de inicio de sesión social: si inicias sesión con Google, recibimos tu nombre, correo y foto de perfil de tu cuenta de Google.',
					'Datos técnicos: dirección IP, tipo de dispositivo y navegador, usados por seguridad (límite de intentos de inicio de sesión, detección de abuso).'
				]
			},
			{
				heading: '2. Por qué usamos tus datos',
				paragraphs: [
					'Para proveer el servicio: guardar tus transacciones, calcular saldos y fórmulas, enviar notificaciones.',
					'Para procesar pagos de planes pagos, mediante Stripe.',
					'Para operar el asistente por WhatsApp, mediante la API oficial de Meta (WhatsApp Business Cloud API) y modelos de IA accedidos vía OpenRouter.',
					'Para mejorar el producto, mediante métricas de uso agregadas (Microsoft Clarity).'
				]
			},
			{
				heading: '3. Con quién compartimos',
				paragraphs: [
					'Stripe (procesamiento de pago de suscripciones) — nunca tenemos acceso al número completo de tu tarjeta.',
					'Meta (mensajes de WhatsApp) y proveedores de IA vía OpenRouter (respuestas del asistente) — solo cuando usas esas funciones.',
					'Google (si eliges iniciar sesión con tu cuenta de Google).',
					'Proveedores de infraestructura (hosting y base de datos) que procesan datos en nuestro nombre, bajo acuerdos de confidencialidad.',
					'Nunca vendemos tus datos a terceros.'
				]
			},
			{
				heading: '4. Tus derechos',
				paragraphs: [
					'Puedes, en cualquier momento: confirmar si tratamos tus datos, acceder a ellos, corregirlos, solicitar anonimización/eliminación, portar tus datos y revocar consentimientos.',
					'Puedes eliminar tu cuenta y todos los datos asociados directamente desde la configuración de la app, en cualquier momento.'
				]
			},
			{
				heading: '5. Seguridad',
				paragraphs: [
					'Todo el tráfico está cifrado (HTTPS). Las contraseñas se almacenan con hash. Aplicamos límite de intentos y bloqueo temporal contra ataques de fuerza bruta.'
				]
			},
			{
				heading: '6. Contacto',
				paragraphs: [
					'¿Dudas sobre privacidad? Escribe a privacidad@example.com (reemplazar con el correo real antes de publicar).'
				]
			}
		]
	}
};

export const TERMS: Record<Lang, LegalPage> = {
	pt: {
		title: 'Termos de Uso',
		updatedAt: 'Última atualização: agosto de 2026',
		intro: 'Ao criar uma conta no Marcelus, você concorda com estes termos.',
		sections: [
			{
				heading: '1. O que é o Marcelus',
				paragraphs: [
					'O Marcelus é uma ferramenta de organização financeira pessoal. Ele não é uma instituição financeira, não oferece consultoria de investimentos e não emite recomendações financeiras — os cálculos e projeções são só uma organização dos dados que você mesmo insere.'
				]
			},
			{
				heading: '2. Sua conta',
				paragraphs: [
					'Você é responsável por manter sua senha em sigilo e por tudo o que acontecer na sua conta. Avise a gente imediatamente se suspeitar de uso não autorizado.'
				]
			},
			{
				heading: '3. Planos e cobrança',
				paragraphs: [
					'Planos pagos são cobrados de forma recorrente, no intervalo escolhido, através do Stripe.',
					'Cancelamento não tem reembolso, exceto dentro dos primeiros 7 dias após a assinatura.',
					'Trials, quando oferecidos, viram cobrança automática ao final do período, salvo cancelamento antes disso.'
				]
			},
			{
				heading: '4. Uso aceitável',
				paragraphs: [
					'Não é permitido usar o serviço pra atividades ilegais, tentar acessar contas de terceiros, ou sobrecarregar deliberadamente nossa infraestrutura.'
				]
			},
			{
				heading: '5. Cancelamento e exclusão',
				paragraphs: [
					'Você pode cancelar sua assinatura ou excluir sua conta a qualquer momento pelas configurações do app. A exclusão de conta é permanente.'
				]
			},
			{
				heading: '6. Limitação de responsabilidade',
				paragraphs: [
					'O Marcelus é fornecido "como está". Não nos responsabilizamos por decisões financeiras tomadas com base nos dados organizados no app — a responsabilidade pela exatidão dos lançamentos e pelas decisões é sua.'
				]
			},
			{
				heading: '7. Alterações',
				paragraphs: [
					'Podemos atualizar estes termos; mudanças relevantes serão avisadas no app ou por e-mail.'
				]
			}
		]
	},
	en: {
		title: 'Terms of Service',
		updatedAt: 'Last updated: August 2026',
		intro: 'By creating a Marcelus account, you agree to these terms.',
		sections: [
			{
				heading: '1. What Marcelus is',
				paragraphs: [
					'Marcelus is a personal finance organization tool. It is not a financial institution, does not offer investment advice, and does not issue financial recommendations — calculations and projections are just an organization of the data you enter yourself.'
				]
			},
			{
				heading: '2. Your account',
				paragraphs: [
					'You are responsible for keeping your password confidential and for everything that happens on your account. Let us know immediately if you suspect unauthorized use.'
				]
			},
			{
				heading: '3. Plans and billing',
				paragraphs: [
					'Paid plans are billed recurrently, at the chosen interval, through Stripe.',
					'Cancellations are non-refundable, except within the first 7 days after subscribing.',
					'Trials, when offered, turn into automatic billing at the end of the period unless canceled before then.'
				]
			},
			{
				heading: '4. Acceptable use',
				paragraphs: [
					'You may not use the service for illegal activities, attempt to access other users’ accounts, or deliberately overload our infrastructure.'
				]
			},
			{
				heading: '5. Cancellation and deletion',
				paragraphs: [
					'You can cancel your subscription or delete your account at any time from the app settings. Account deletion is permanent.'
				]
			},
			{
				heading: '6. Limitation of liability',
				paragraphs: [
					'Marcelus is provided "as is". We are not liable for financial decisions made based on the data organized in the app — responsibility for the accuracy of entries and for decisions is yours.'
				]
			},
			{
				heading: '7. Changes',
				paragraphs: [
					'We may update these terms; material changes will be announced in the app or by email.'
				]
			}
		]
	},
	es: {
		title: 'Términos de Servicio',
		updatedAt: 'Última actualización: agosto de 2026',
		intro: 'Al crear una cuenta en Marcelus, aceptas estos términos.',
		sections: [
			{
				heading: '1. Qué es Marcelus',
				paragraphs: [
					'Marcelus es una herramienta de organización financiera personal. No es una institución financiera, no ofrece asesoría de inversiones ni emite recomendaciones financieras — los cálculos y proyecciones son solo una organización de los datos que tú mismo ingresas.'
				]
			},
			{
				heading: '2. Tu cuenta',
				paragraphs: [
					'Eres responsable de mantener tu contraseña en secreto y de todo lo que ocurra en tu cuenta. Avísanos de inmediato si sospechas de un uso no autorizado.'
				]
			},
			{
				heading: '3. Planes y facturación',
				paragraphs: [
					'Los planes pagos se cobran de forma recurrente, en el intervalo elegido, mediante Stripe.',
					'Las cancelaciones no tienen reembolso, excepto dentro de los primeros 7 días después de suscribirte.',
					'Las pruebas gratuitas, cuando se ofrecen, se convierten en cobro automático al final del período, salvo cancelación antes de eso.'
				]
			},
			{
				heading: '4. Uso aceptable',
				paragraphs: [
					'No está permitido usar el servicio para actividades ilegales, intentar acceder a cuentas de terceros, o sobrecargar deliberadamente nuestra infraestructura.'
				]
			},
			{
				heading: '5. Cancelación y eliminación',
				paragraphs: [
					'Puedes cancelar tu suscripción o eliminar tu cuenta en cualquier momento desde la configuración de la app. La eliminación de cuenta es permanente.'
				]
			},
			{
				heading: '6. Limitación de responsabilidad',
				paragraphs: [
					'Marcelus se provee "tal cual". No somos responsables por decisiones financieras tomadas con base en los datos organizados en la app — la responsabilidad por la exactitud de los registros y por las decisiones es tuya.'
				]
			},
			{
				heading: '7. Cambios',
				paragraphs: [
					'Podemos actualizar estos términos; los cambios relevantes se avisarán en la app o por correo electrónico.'
				]
			}
		]
	}
};
