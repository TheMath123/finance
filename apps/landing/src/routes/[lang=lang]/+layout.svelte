<script lang="ts">
	import { mode, ModeWatcher } from 'mode-watcher';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import { PUBLIC_APP_URL } from '$lib/public-env';
	import CookieConsentBanner from '$lib/components/cookie-consent-banner.svelte';
	import PricingSkeleton from '$lib/components/pricing-skeleton.svelte';
	import { MESSAGES } from '$lib/i18n/messages';
	import { SUPPORTED_LANGS, type Lang } from '../../params/lang';

	import '../layout.css';

	let { data, children } = $props();

	const t = $derived(MESSAGES[data.lang as Lang]);

	const LANG_LABELS: Record<Lang, string> = { pt: 'PT', en: 'EN', es: 'ES' };

	// Tema claro tem fundo quase-branco (precisa da marca escura); tema
	// escuro tem fundo quase-preto (precisa da marca em teal vibrante) —
	// mesmo padrão do sidebar do dashboard.
	const logoSrc = $derived(
		mode.current === 'light' ? '/marcelus-logo-light.svg' : '/marcelus-logo.svg'
	);

	/**
	 * Troca só o primeiro segmento da URL atual (o idioma), preservando a
	 * página — não dá pra tipar isso com `resolve()` porque o restante do
	 * caminho é computado em runtime, não um literal conhecido em build-time.
	 */
	function hrefForLang(lang: Lang): string {
		const segments = page.url.pathname.split('/');
		segments[1] = lang;
		return segments.join('/') || '/';
	}

	function onLangChange(event: Event & { currentTarget: HTMLSelectElement }) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- destino computado em runtime, ver hrefForLang
		goto(hrefForLang(event.currentTarget.value as Lang));
	}

	// Skeleton só durante a navegação client-side pra /pricing (evita Layout
	// Shift enquanto o load() da rota busca os planos na API) — nas outras
	// rotas a navegação já é rápida o bastante (sem chamada de API) pra não
	// precisar de estado de carregamento próprio.
	const navigatingToPricing = $derived(navigating.to?.url.pathname.endsWith('/pricing') ?? false);
</script>

<svelte:head>
	<!--
		Verificação de propriedade do domínio (revisão da tela de consentimento
		OAuth) foi resolvida via DNS direto no Search Console — não precisa de
		meta tag no HTML. og:site_name reforça que o nome do app bate com a
		home page (2º requisito da mesma revisão).
	-->
	<meta property="og:site_name" content="Marcelus" />
	<!-- Defaults globais de embed (Discord/WhatsApp/Slack/etc.) — cada página
	     (home, pricing) sobrescreve og:title/og:description/og:url no seu
	     próprio <svelte:head>; imagem e tipo ficam só aqui, iguais em todo
	     lugar. og-image.png é o mesmo asset usado no dashboard, pra reforçar
	     a mesma identidade visual nos dois domínios. -->
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://marcelus.app/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="https://marcelus.app/og-image.png" />
</svelte:head>

<!-- defaultMode="light" + track={false}: mesma decisão do dashboard — a
     aplicação sempre abre no modo claro, não segue o dark mode do SO do
     visitante. Modo escuro segue existindo/estilizado em layout.css, só
     deixa de ser o ponto de entrada automático. -->
<ModeWatcher defaultMode="light" track={false} />

<div class="flex min-h-screen flex-col">
	<header class="border-b border-border">
		<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
			<a href={resolve(`/${data.lang}`)} class="flex items-center gap-2.5">
				<img src={logoSrc} alt="" class="h-7 w-7 shrink-0 object-contain" />
				<span class="font-display text-xl tracking-tight">Marcelus</span>
			</a>
			<nav class="flex items-center gap-5 text-sm sm:gap-8">
				<!-- Âncoras de conteúdo: só a partir de sm — na tela pequena o essencial
				     (Preços/Entrar) já ocupa o espaço disponível, e o conteúdo continua
				     alcançável rolando a própria home. -->
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- âncora na home, resolve() não compõe hash -->
				<a
					href="{resolve(`/${data.lang}`)}#funcionalidades"
					class="hidden text-[13px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground sm:inline"
				>
					{t.nav.features}
				</a>
				<a
					href={resolve(`/${data.lang}/pricing`)}
					class="text-[13px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
				>
					{t.nav.pricing}
				</a>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
				<a
					href="{PUBLIC_APP_URL}/login"
					class="border border-foreground px-5 py-2.5 text-sm font-medium tracking-wide transition-colors hover:bg-foreground hover:text-background"
				>
					{t.nav.login}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</nav>
		</div>
	</header>

	<main class="flex-1">
		{#if navigatingToPricing}
			<PricingSkeleton />
		{:else}
			{@render children()}
		{/if}
	</main>

	<footer class="border-t border-border">
		<div class="mx-auto max-w-6xl px-6 py-14">
			<div class="flex flex-col gap-10 sm:flex-row sm:justify-between">
				<div class="flex items-center gap-2.5">
					<img src={logoSrc} alt="" class="h-6 w-6 shrink-0 object-contain opacity-80" />
					<span class="font-display text-lg tracking-tight">Marcelus</span>
				</div>
				<div
					class="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs tracking-wide text-muted-foreground uppercase"
				>
					<a
						href={resolve(`/${data.lang}/pricing`)}
						class="transition-colors hover:text-foreground"
					>
						{t.footer.pricing}
					</a>
					<a
						href={resolve(`/${data.lang}/privacy`)}
						class="transition-colors hover:text-foreground"
					>
						{t.footer.privacy}
					</a>
					<a href={resolve(`/${data.lang}/terms`)} class="transition-colors hover:text-foreground">
						{t.footer.terms}
					</a>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- mailto, não é rota interna -->
					<a href="mailto:suporte@marcelus.app" class="transition-colors hover:text-foreground">
						{t.footer.contact}
					</a>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
					<a href="{PUBLIC_APP_URL}/login" class="transition-colors hover:text-foreground">
						{t.footer.login}
					</a>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
					<a href="{PUBLIC_APP_URL}/register" class="transition-colors hover:text-foreground">
						{t.footer.signup}
					</a>
					<!-- select "ghost": sem borda/fundo padrão, só realce no hover/foco, chevron próprio via CaretDownIcon (appearance-none esconde a seta nativa) -->
					<div class="relative inline-flex items-center normal-case">
						<select
							value={data.lang}
							onchange={onLangChange}
							aria-label={t.footer.language}
							class="cursor-pointer appearance-none bg-transparent py-1 pr-6 pl-2 text-xs tracking-wide text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
						>
							{#each SUPPORTED_LANGS as lang (lang)}
								<option value={lang}>{LANG_LABELS[lang]}</option>
							{/each}
						</select>
						<CaretDownIcon size={11} class="pointer-events-none absolute right-2" />
					</div>
				</div>
			</div>
			<div class="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
				&copy; {new Date().getFullYear()} Marcelus App. {t.footer.rights}
			</div>
		</div>
	</footer>
</div>

<CookieConsentBanner
	t={t.cookieConsent}
	lang={data.lang as Lang}
	initialConsent={data.cookieConsent}
/>
