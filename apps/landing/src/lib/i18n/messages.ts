import type { Lang } from '../../params/lang';

export interface Feature {
	title: string;
	description: string;
}

export interface Messages {
	nav: {
		pricing: string;
		login: string;
	};
	footer: {
		rights: string;
		pricing: string;
		login: string;
		signup: string;
		privacy: string;
		terms: string;
		language: string;
	};
	home: {
		title: string;
		titleHighlight: string;
		subtitle: string;
		ctaPrimary: string;
		ctaSecondary: string;
		features: Feature[];
		bannerTitle: string;
		bannerSubtitle: string;
		bannerSecondary: string;
	};
	pricing: {
		title: string;
		subtitle: string;
		freeTitle: string;
		freeDescription: string;
		freePrice: string;
		signupFree: string;
		trialDays: (days: number) => string;
		workspaces: (n: number) => string;
		members: (n: number) => string;
		formulas: (n: number) => string;
		subscribe: string;
		intervalMonth: string;
		intervalYear: string;
		intervalWeek: string;
		intervalDay: string;
		everyNIntervals: (n: number, unit: string) => string;
		perInterval: (unit: string) => string;
		savePercent: (percent: number) => string;
		billingIntervalLabel: string;
		toggleMonthly: string;
		toggleSemiannual: string;
		toggleAnnual: string;
	};
	cookieConsent: {
		text: string;
		learnMore: string;
		necessaryOnly: string;
		acceptAll: string;
	};
}

export const MESSAGES: Record<Lang, Messages> = {
	pt: {
		nav: { pricing: 'Planos', login: 'Entrar' },
		footer: {
			rights: 'Todos os direitos reservados.',
			pricing: 'Planos',
			login: 'Entrar',
			signup: 'Criar conta',
			privacy: 'Privacidade',
			terms: 'Termos de uso',
			language: 'Idioma'
		},
		home: {
			title: 'Suas finanças,',
			titleHighlight: 'sem planilha',
			subtitle:
				'Marcelus é um aplicativo de organização financeira pessoal: contas, cartões, fórmulas personalizadas e despesas divididas com quem você quiser — tudo num só lugar, com um assistente que também mora no seu WhatsApp.',
			ctaPrimary: 'Criar conta grátis',
			ctaSecondary: 'Já tenho conta',
			features: [
				{
					title: 'Contas e cartões num só lugar',
					description:
						'Lance despesas e receitas de várias contas e cartões, com faturas e parcelamentos calculados automaticamente.'
				},
				{
					title: 'Fórmulas personalizadas',
					description:
						'Crie cálculos próprios com os números reais do seu mês — saldo, gastos por categoria, disponível projetado.'
				},
				{
					title: 'Divida despesas com quem quiser',
					description:
						'Transfira ou divida uma conta com outra pessoa direto pelo app, sem precisar acertar depois.'
				},
				{
					title: 'Importe fatura e extrato',
					description: 'Suba o CSV do banco ou da fatura do cartão e as transações entram sozinhas.'
				},
				{
					title: 'Assistente pelo WhatsApp',
					description:
						'Pergunte pelos seus gastos e lance transações direto na conversa do WhatsApp.'
				},
				{
					title: 'Recorrências automáticas',
					description:
						'Assinaturas e contas fixas se repetem sozinhas todo mês, sem você lançar de novo.'
				}
			],
			bannerTitle: 'Pronto pra organizar sua vida financeira?',
			bannerSubtitle: 'Comece grátis hoje e veja seus números fazendo sentido pela primeira vez.',
			bannerSecondary: 'Ver planos'
		},
		pricing: {
			title: 'Planos que cabem no seu momento',
			subtitle: 'Comece de graça e evolua quando fizer sentido pra você.',
			freeTitle: 'Gratuito',
			freeDescription: 'Pra começar a organizar suas finanças.',
			freePrice: 'R$ 0',
			signupFree: 'Criar conta grátis',
			trialDays: (days) => `${days} dias grátis`,
			workspaces: (n) => `${n} workspace(s)`,
			members: (n) => `${n} membro(s)`,
			formulas: (n) => `${n} fórmula(s)`,
			subscribe: 'Assinar',
			intervalMonth: 'mês',
			intervalYear: 'ano',
			intervalWeek: 'semana',
			intervalDay: 'dia',
			everyNIntervals: (n, unit) => `a cada ${n} ${unit}s`,
			perInterval: (unit) => `por ${unit}`,
			savePercent: (percent) => `economize ${percent}%`,
			billingIntervalLabel: 'Intervalo de cobrança',
			toggleMonthly: 'Mensal',
			toggleSemiannual: 'Semestral',
			toggleAnnual: 'Anual'
		},
		cookieConsent: {
			text: 'Usamos cookies necessários pro funcionamento do site e, com sua permissão, cookies de análise (Microsoft Clarity) pra entender como o produto é usado.',
			learnMore: 'Saiba mais',
			necessaryOnly: 'Somente necessários',
			acceptAll: 'Aceitar todos'
		}
	},
	en: {
		nav: { pricing: 'Pricing', login: 'Log in' },
		footer: {
			rights: 'All rights reserved.',
			pricing: 'Pricing',
			login: 'Log in',
			signup: 'Sign up',
			privacy: 'Privacy',
			terms: 'Terms of service',
			language: 'Language'
		},
		home: {
			title: 'Your finances,',
			titleHighlight: 'no spreadsheets',
			subtitle:
				'Marcelus is a personal finance organization app: accounts, cards, custom formulas, and expenses split with anyone you want — all in one place, with an assistant that also lives on your WhatsApp.',
			ctaPrimary: 'Create free account',
			ctaSecondary: 'I already have an account',
			features: [
				{
					title: 'Accounts and cards in one place',
					description:
						'Log expenses and income across multiple accounts and cards, with invoices and installments calculated automatically.'
				},
				{
					title: 'Custom formulas',
					description:
						'Build your own calculations with your real monthly numbers — balance, spending by category, projected available amount.'
				},
				{
					title: 'Split expenses with anyone',
					description:
						'Transfer or split a bill with someone else right from the app, no need to settle up later.'
				},
				{
					title: 'Import statements and invoices',
					description: 'Upload your bank or card CSV and transactions load themselves.'
				},
				{
					title: 'WhatsApp assistant',
					description: 'Ask about your spending and log transactions right from a WhatsApp chat.'
				},
				{
					title: 'Automatic recurrences',
					description: 'Subscriptions and fixed bills repeat themselves every month automatically.'
				}
			],
			bannerTitle: 'Ready to organize your finances?',
			bannerSubtitle: 'Start free today and see your numbers make sense for the first time.',
			bannerSecondary: 'See pricing'
		},
		pricing: {
			title: 'Plans that fit where you are',
			subtitle: 'Start for free and upgrade when it makes sense for you.',
			freeTitle: 'Free',
			freeDescription: 'To start organizing your finances.',
			freePrice: '$0',
			signupFree: 'Create free account',
			trialDays: (days) => `${days} days free`,
			workspaces: (n) => `${n} workspace(s)`,
			members: (n) => `${n} member(s)`,
			formulas: (n) => `${n} formula(s)`,
			subscribe: 'Subscribe',
			intervalMonth: 'month',
			intervalYear: 'year',
			intervalWeek: 'week',
			intervalDay: 'day',
			everyNIntervals: (n, unit) => `every ${n} ${unit}s`,
			perInterval: (unit) => `per ${unit}`,
			savePercent: (percent) => `save ${percent}%`,
			billingIntervalLabel: 'Billing interval',
			toggleMonthly: 'Monthly',
			toggleSemiannual: 'Semiannual',
			toggleAnnual: 'Annual'
		},
		cookieConsent: {
			text: 'We use cookies necessary for the site to work and, with your permission, analytics cookies (Microsoft Clarity) to understand how the product is used.',
			learnMore: 'Learn more',
			necessaryOnly: 'Necessary only',
			acceptAll: 'Accept all'
		}
	},
	es: {
		nav: { pricing: 'Planes', login: 'Iniciar sesión' },
		footer: {
			rights: 'Todos los derechos reservados.',
			pricing: 'Planes',
			login: 'Iniciar sesión',
			signup: 'Crear cuenta',
			privacy: 'Privacidad',
			terms: 'Términos de servicio',
			language: 'Idioma'
		},
		home: {
			title: 'Tus finanzas,',
			titleHighlight: 'sin hojas de cálculo',
			subtitle:
				'Marcelus es una aplicación de organización financiera personal: cuentas, tarjetas, fórmulas personalizadas y gastos compartidos con quien quieras — todo en un solo lugar, con un asistente que también vive en tu WhatsApp.',
			ctaPrimary: 'Crear cuenta gratis',
			ctaSecondary: 'Ya tengo una cuenta',
			features: [
				{
					title: 'Cuentas y tarjetas en un solo lugar',
					description:
						'Registra gastos e ingresos de varias cuentas y tarjetas, con facturas y cuotas calculadas automáticamente.'
				},
				{
					title: 'Fórmulas personalizadas',
					description:
						'Crea tus propios cálculos con los números reales de tu mes — saldo, gastos por categoría, disponible proyectado.'
				},
				{
					title: 'Divide gastos con quien quieras',
					description:
						'Transfiere o divide una cuenta con otra persona directo desde la app, sin tener que ajustar cuentas después.'
				},
				{
					title: 'Importa factura y extracto',
					description:
						'Sube el CSV del banco o de la factura de la tarjeta y las transacciones entran solas.'
				},
				{
					title: 'Asistente por WhatsApp',
					description:
						'Pregunta por tus gastos y registra transacciones directo en la conversación de WhatsApp.'
				},
				{
					title: 'Recurrencias automáticas',
					description:
						'Suscripciones y cuentas fijas se repiten solas cada mes, sin que tengas que registrarlas de nuevo.'
				}
			],
			bannerTitle: '¿Listo para organizar tu vida financiera?',
			bannerSubtitle: 'Empieza gratis hoy y mira tus números tener sentido por primera vez.',
			bannerSecondary: 'Ver planes'
		},
		pricing: {
			title: 'Planes que se ajustan a tu momento',
			subtitle: 'Empieza gratis y evoluciona cuando tenga sentido para ti.',
			freeTitle: 'Gratuito',
			freeDescription: 'Para empezar a organizar tus finanzas.',
			freePrice: '$0',
			signupFree: 'Crear cuenta gratis',
			trialDays: (days) => `${days} días gratis`,
			workspaces: (n) => `${n} workspace(s)`,
			members: (n) => `${n} miembro(s)`,
			formulas: (n) => `${n} fórmula(s)`,
			subscribe: 'Suscribirse',
			intervalMonth: 'mes',
			intervalYear: 'año',
			intervalWeek: 'semana',
			intervalDay: 'día',
			everyNIntervals: (n, unit) => `cada ${n} ${unit}s`,
			perInterval: (unit) => `por ${unit}`,
			savePercent: (percent) => `ahorra ${percent}%`,
			billingIntervalLabel: 'Intervalo de facturación',
			toggleMonthly: 'Mensual',
			toggleSemiannual: 'Semestral',
			toggleAnnual: 'Anual'
		},
		cookieConsent: {
			text: 'Usamos cookies necesarias para el funcionamiento del sitio y, con tu permiso, cookies de análisis (Microsoft Clarity) para entender cómo se usa el producto.',
			learnMore: 'Saber más',
			necessaryOnly: 'Solo necesarias',
			acceptAll: 'Aceptar todas'
		}
	}
};
