<script lang="ts">
	import { mode, ModeWatcher } from 'mode-watcher';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { PUBLIC_APP_URL } from '$env/static/public';
	import CookieConsentBanner from '$lib/components/cookie-consent-banner.svelte';
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
</script>

<ModeWatcher />

<div class="flex min-h-screen flex-col">
	<header class="border-b border-border">
		<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
			<a href={resolve(`/${data.lang}`)} class="flex items-center gap-2 font-semibold">
				<img src={logoSrc} alt="" class="h-8 w-8 shrink-0 object-contain" />
				Marcelus
			</a>
			<nav class="flex items-center gap-4 text-sm sm:gap-6">
				<a
					href={resolve(`/${data.lang}/pricing`)}
					class="text-muted-foreground transition-colors hover:text-foreground"
				>
					{t.nav.pricing}
				</a>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
				<a
					href="{PUBLIC_APP_URL}/login"
					class="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90"
				>
					{t.nav.login}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</nav>
		</div>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="border-t border-border">
		<div
			class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row"
		>
			<p>&copy; {new Date().getFullYear()} Marcelus. {t.footer.rights}</p>
			<div class="flex flex-wrap items-center justify-center gap-4">
				<a href={resolve(`/${data.lang}/pricing`)} class="transition-colors hover:text-foreground">
					{t.footer.pricing}
				</a>
				<a href={resolve(`/${data.lang}/privacy`)} class="transition-colors hover:text-foreground">
					{t.footer.privacy}
				</a>
				<a href={resolve(`/${data.lang}/terms`)} class="transition-colors hover:text-foreground">
					{t.footer.terms}
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
				<div class="relative inline-flex items-center">
					<select
						value={data.lang}
						onchange={onLangChange}
						aria-label={t.footer.language}
						class="cursor-pointer appearance-none rounded-lg bg-transparent py-1 pr-6 pl-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
					>
						{#each SUPPORTED_LANGS as lang (lang)}
							<option value={lang}>{LANG_LABELS[lang]}</option>
						{/each}
					</select>
					<CaretDownIcon size={12} class="pointer-events-none absolute right-2" />
				</div>
			</div>
		</div>
	</footer>
</div>

<CookieConsentBanner t={t.cookieConsent} lang={data.lang as Lang} />
