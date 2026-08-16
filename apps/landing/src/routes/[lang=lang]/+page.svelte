<script lang="ts">
	import CalculatorIcon from 'phosphor-svelte/lib/CalculatorIcon';
	import ChatCircleIcon from 'phosphor-svelte/lib/ChatCircleIcon';
	import UsersThreeIcon from 'phosphor-svelte/lib/UsersThreeIcon';

	import { resolve } from '$app/paths';
	import { PUBLIC_APP_URL } from '$lib/public-env';
	import { MESSAGES } from '$lib/i18n/messages';
	import HeroDeviceMockup from '$lib/components/hero-device-mockup.svelte';
	import type { Lang } from '../../params/lang';

	let { data } = $props();

	const t = $derived(MESSAGES[data.lang as Lang]);

	// Mesma ordem dos ícones em todos os idiomas — o texto vem de
	// t.home.features (3 itens, ver especificação de conteúdo).
	const FEATURE_ICONS = [ChatCircleIcon, UsersThreeIcon, CalculatorIcon];
</script>

<svelte:head>
	<title>Marcelus — {t.home.tagline}</title>
	<meta name="description" content={t.home.subtitle} />
	<meta property="og:title" content="Marcelus — {t.home.tagline}" />
	<meta property="og:description" content={t.home.subtitle} />
	<meta property="og:url" content="https://marcelus.app/{data.lang}" />
</svelte:head>

<section class="mx-auto max-w-6xl px-6 pt-20 pb-20 sm:pt-28 sm:pb-28">
	<div class="grid items-center gap-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
		<div class="text-center lg:text-left">
			<h1 class="font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
				{t.home.title}
				<span class="block text-primary italic">{t.home.titleHighlight}</span>
				<span class="mt-3 block text-2xl leading-tight font-normal text-foreground sm:text-3xl">
					{t.home.tagline}
				</span>
			</h1>
			<p class="mx-auto mt-8 max-w-xl text-lg text-muted-foreground lg:mx-0">
				{t.home.subtitle}
			</p>
			<div class="mt-11 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
				<div class="flex flex-col items-center gap-3 sm:items-start">
					<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio), resolve() é só pra rotas internas -->
					<a
						href="{PUBLIC_APP_URL}/register"
						class="bg-foreground px-8 py-3.5 text-sm font-medium tracking-wide text-background uppercase transition-opacity hover:opacity-85"
					>
						{t.home.ctaPrimary}
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
					<p class="text-xs text-muted-foreground">{t.home.ctaPrimaryHint}</p>
				</div>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
				<a
					href="{PUBLIC_APP_URL}/login"
					class="border border-foreground/30 px-8 py-3.5 text-sm font-medium tracking-wide uppercase transition-colors hover:border-foreground hover:bg-accent"
				>
					{t.home.ctaSecondary}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
		</div>

		<HeroDeviceMockup t={t.home.heroMockup} />
	</div>
</section>

<section class="border-y border-border bg-accent/30">
	<div class="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
		<h2 class="font-display text-3xl tracking-tight sm:text-5xl">{t.home.painTitle}</h2>
		<p class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{t.home.painText}</p>
	</div>
</section>

<section id="funcionalidades" class="scroll-mt-20 border-b border-border">
	<div class="mx-auto max-w-5xl px-6">
		{#each t.home.features as feature, i (feature.title)}
			{@const Icon = FEATURE_ICONS[i]}
			<div
				class="group flex flex-col gap-4 border-b border-border py-12 transition-colors last:border-b-0 sm:flex-row sm:items-start sm:gap-12 sm:py-16"
			>
				<div class="flex shrink-0 items-center gap-3 sm:w-72">
					<Icon size={20} weight="light" class="text-brand-dark" />
					<h2 class="font-display text-xl tracking-tight">{feature.title}</h2>
				</div>
				<div class="max-w-xl">
					<p class="font-display text-xl text-primary italic">{feature.tagline}</p>
					<p class="mt-3 text-muted-foreground">{feature.description}</p>
				</div>
			</div>
		{/each}
	</div>
</section>

<section class="bg-foreground text-background">
	<div class="mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
		<h2 class="font-display text-3xl tracking-tight sm:text-5xl">{t.home.bannerTitle}</h2>
		<p class="mx-auto mt-5 max-w-xl text-background/70">
			{t.home.bannerSubtitle}
		</p>
		<div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
			<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
			<a
				href="{PUBLIC_APP_URL}/register"
				class="bg-primary px-8 py-3.5 text-sm font-medium tracking-wide text-primary-foreground uppercase transition-opacity hover:opacity-85"
			>
				{t.home.ctaPrimary}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
			<a
				href={resolve(`/${data.lang}/pricing`)}
				class="border border-background/30 px-8 py-3.5 text-sm font-medium tracking-wide text-background uppercase transition-colors hover:border-background hover:bg-background/10"
			>
				{t.home.bannerSecondary}
			</a>
		</div>
	</div>
</section>
