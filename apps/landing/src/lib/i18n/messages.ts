import type { Lang } from '../../params/lang';

export interface Feature {
	title: string;
	tagline: string;
	description: string;
}

export interface HeroMockup {
	chatUser: string;
	chatCategory: string;
	chatAmount: string;
	chatWhen: string;
	dashboardLabel: string;
	dashboardValue: string;
	dashboardRows: string[];
}

export interface Messages {
	nav: {
		features: string;
		families: string;
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
		contact: string;
		language: string;
	};
	home: {
		title: string;
		titleHighlight: string;
		tagline: string;
		subtitle: string;
		ctaPrimary: string;
		ctaPrimaryHint: string;
		ctaSecondary: string;
		heroMockup: HeroMockup;
		painTitle: string;
		painText: string;
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
		enterpriseTitle: string;
		enterpriseDescription: string;
		enterprisePrice: string;
		enterpriseCta: string;
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
		nav: {
			features: 'Funcionalidades',
			families: 'Para Famílias',
			pricing: 'Preços',
			login: 'Entrar'
		},
		footer: {
			rights: 'Todos os direitos reservados.',
			pricing: 'Preços',
			login: 'Entrar',
			signup: 'Criar conta',
			privacy: 'Privacidade',
			terms: 'Termos de uso',
			contact: 'Contato e Suporte',
			language: 'Idioma'
		},
		home: {
			title: 'Conheça o',
			titleHighlight: 'Marcelus',
			tagline: 'O seu app de organização financeira pessoal e compartilhada.',
			subtitle:
				'Chega de abandonar planilhas no meio do mês. O Marcelus é o ecossistema inteligente que organiza seu dinheiro através do WhatsApp, aplicativo móvel ou painel web. Lance gastos conversando com nossa IA, divida contas com sua família e tenha o controle real do seu futuro.',
			ctaPrimary: 'Comece a usar de graça',
			ctaPrimaryHint: 'Não exige cartão de crédito. Cancele quando quiser.',
			ctaSecondary: 'Já tenho conta',
			heroMockup: {
				chatUser: 'Paguei 50 no mercado hoje',
				chatCategory: 'Mercado',
				chatAmount: '- R$ 50,00',
				chatWhen: 'Hoje',
				dashboardLabel: 'Saldo disponível',
				dashboardValue: 'R$ 4.280,00',
				dashboardRows: ['Salário', 'Mercado', 'Aluguel']
			},
			painTitle: 'A gente sabe, lançar gastos em aplicativo dá preguiça. E muito trabalho.',
			painText:
				'A maioria dos apps de finanças exige que você abra o aplicativo, escolha a conta, procure a categoria e confirme. Esse atrito é o motivo pelo qual você desiste. O Marcelus inverte a lógica, nós nos encaixamos no seu hábito. Você já passa o dia no WhatsApp, certo? Então é lá que sua gestão financeira acontece.',
			features: [
				{
					title: 'IA no WhatsApp',
					tagline: 'Mandou, registrou. Simples assim.',
					description:
						'Envie uma mensagem como "Paguei 50 no mercado hoje" no WhatsApp. A inteligência artificial do Marcelus entende o contexto, categoriza, seleciona a data e atualiza seu painel na mesma hora.'
				},
				{
					title: 'Finanças Compartilhadas',
					tagline: 'Dinheiro não precisa ser tabu. Compartilhe a visão, não a senha.',
					description:
						'Crie Workspaces para gerenciar as finanças da sua casa. Defina papéis e saiba exatamente quem pagou o quê, tudo em um só lugar.'
				},
				{
					title: 'Fórmulas e Personalização',
					tagline: 'Suas regras, suas métricas.',
					description:
						'Esqueça relatórios engessados. Monte indicadores customizados, como "quanto sobra após pagar o aluguel", e fixe na sua tela inicial.'
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
			toggleAnnual: 'Anual',
			enterpriseTitle: 'Enterprise',
			enterpriseDescription: 'Workspaces e membros adicionais, sob demanda.',
			enterprisePrice: 'Sob consulta',
			enterpriseCta: 'Falar com vendas'
		},
		cookieConsent: {
			text: 'Usamos cookies necessários pro funcionamento do site e, com sua permissão, cookies de análise (Microsoft Clarity) pra entender como o produto é usado.',
			learnMore: 'Saiba mais',
			necessaryOnly: 'Somente necessários',
			acceptAll: 'Aceitar todos'
		}
	},
	en: {
		nav: {
			features: 'Features',
			families: 'For Families',
			pricing: 'Pricing',
			login: 'Log in'
		},
		footer: {
			rights: 'All rights reserved.',
			pricing: 'Pricing',
			login: 'Log in',
			signup: 'Sign up',
			privacy: 'Privacy',
			terms: 'Terms of service',
			contact: 'Contact & Support',
			language: 'Language'
		},
		home: {
			title: 'Meet',
			titleHighlight: 'Marcelus',
			tagline: 'Your personal and shared finance organization app.',
			subtitle:
				'Stop abandoning spreadsheets halfway through the month. Marcelus is the intelligent ecosystem that organizes your money through WhatsApp, a mobile app, or a web dashboard. Log expenses by chatting with our AI, split bills with your family, and take real control of your future.',
			ctaPrimary: 'Start using for free',
			ctaPrimaryHint: 'No credit card required. Cancel anytime.',
			ctaSecondary: 'I already have an account',
			heroMockup: {
				chatUser: 'Paid 50 at the grocery store today',
				chatCategory: 'Groceries',
				chatAmount: '- $50.00',
				chatWhen: 'Today',
				dashboardLabel: 'Available balance',
				dashboardValue: '$4,280.00',
				dashboardRows: ['Salary', 'Groceries', 'Rent']
			},
			painTitle: 'We get it — logging expenses in an app feels like a chore. And a lot of work.',
			painText:
				'Most finance apps make you open the app, pick the account, find the category, and confirm. That friction is why you give up. Marcelus flips the logic — we fit into your habit. You already spend your day on WhatsApp, right? That is where your money management happens.',
			features: [
				{
					title: 'AI on WhatsApp',
					tagline: 'Send it, it is logged. That simple.',
					description:
						'Send a message like "Paid 50 at the grocery store today" on WhatsApp. Marcelus\' AI understands the context, categorizes it, picks the date, and updates your dashboard right away.'
				},
				{
					title: 'Shared Finances',
					tagline: 'Money does not have to be taboo. Share the view, not the password.',
					description:
						'Create Workspaces to manage your household finances. Set roles and know exactly who paid for what, all in one place.'
				},
				{
					title: 'Formulas & Customization',
					tagline: 'Your rules, your metrics.',
					description:
						'Forget rigid reports. Build custom indicators, like "how much is left after rent," and pin them to your home screen.'
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
			toggleAnnual: 'Annual',
			enterpriseTitle: 'Enterprise',
			enterpriseDescription: 'Additional workspaces and members, on demand.',
			enterprisePrice: 'Custom pricing',
			enterpriseCta: 'Talk to sales'
		},
		cookieConsent: {
			text: 'We use cookies necessary for the site to work and, with your permission, analytics cookies (Microsoft Clarity) to understand how the product is used.',
			learnMore: 'Learn more',
			necessaryOnly: 'Necessary only',
			acceptAll: 'Accept all'
		}
	},
	es: {
		nav: {
			features: 'Funcionalidades',
			families: 'Para Familias',
			pricing: 'Precios',
			login: 'Iniciar sesión'
		},
		footer: {
			rights: 'Todos los derechos reservados.',
			pricing: 'Precios',
			login: 'Iniciar sesión',
			signup: 'Crear cuenta',
			privacy: 'Privacidad',
			terms: 'Términos de servicio',
			contact: 'Contacto y Soporte',
			language: 'Idioma'
		},
		home: {
			title: 'Conoce a',
			titleHighlight: 'Marcelus',
			tagline: 'Tu aplicación de organización financiera personal y compartida.',
			subtitle:
				'Deja de abandonar las hojas de cálculo a mitad de mes. Marcelus es el ecosistema inteligente que organiza tu dinero a través de WhatsApp, la app móvil o el panel web. Registra gastos conversando con nuestra IA, divide cuentas con tu familia y ten el control real de tu futuro.',
			ctaPrimary: 'Empieza a usarlo gratis',
			ctaPrimaryHint: 'No requiere tarjeta de crédito. Cancela cuando quieras.',
			ctaSecondary: 'Ya tengo una cuenta',
			heroMockup: {
				chatUser: 'Pagué 50 en el supermercado hoy',
				chatCategory: 'Supermercado',
				chatAmount: '- $50,00',
				chatWhen: 'Hoy',
				dashboardLabel: 'Saldo disponible',
				dashboardValue: '$4.280,00',
				dashboardRows: ['Salario', 'Supermercado', 'Alquiler']
			},
			painTitle: 'Lo sabemos: registrar gastos en una app da pereza. Y mucho trabajo.',
			painText:
				'La mayoría de las apps de finanzas exigen que abras la app, elijas la cuenta, busques la categoría y confirmes. Esa fricción es la razón por la que desistes. Marcelus invierte la lógica: nos adaptamos a tu hábito. Ya pasas el día en WhatsApp, ¿verdad? Ahí es donde ocurre tu gestión financiera.',
			features: [
				{
					title: 'IA en WhatsApp',
					tagline: 'Lo mandaste, quedó registrado. Así de simple.',
					description:
						'Envía un mensaje como "Pagué 50 en el supermercado hoy" por WhatsApp. La inteligencia artificial de Marcelus entiende el contexto, categoriza, elige la fecha y actualiza tu panel al instante.'
				},
				{
					title: 'Finanzas Compartidas',
					tagline: 'El dinero no tiene que ser un tabú. Comparte la visión, no la contraseña.',
					description:
						'Crea Workspaces para gestionar las finanzas de tu hogar. Define roles y sabe exactamente quién pagó qué, todo en un solo lugar.'
				},
				{
					title: 'Fórmulas y Personalización',
					tagline: 'Tus reglas, tus métricas.',
					description:
						'Olvida los reportes rígidos. Crea indicadores personalizados, como "cuánto queda después de pagar el alquiler", y fíjalos en tu pantalla de inicio.'
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
			toggleAnnual: 'Anual',
			enterpriseTitle: 'Enterprise',
			enterpriseDescription: 'Workspaces y miembros adicionales, bajo demanda.',
			enterprisePrice: 'Precio a medida',
			enterpriseCta: 'Hablar con ventas'
		},
		cookieConsent: {
			text: 'Usamos cookies necesarias para el funcionamiento del sitio y, con tu permiso, cookies de análisis (Microsoft Clarity) para entender cómo se usa el producto.',
			learnMore: 'Saber más',
			necessaryOnly: 'Solo necesarias',
			acceptAll: 'Aceptar todas'
		}
	}
};
