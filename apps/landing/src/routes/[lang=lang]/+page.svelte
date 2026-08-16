<script lang="ts">
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import CalculatorIcon from 'phosphor-svelte/lib/CalculatorIcon';
	import ChatCircleIcon from 'phosphor-svelte/lib/ChatCircleIcon';
	import FileArrowUpIcon from 'phosphor-svelte/lib/FileArrowUpIcon';
	import UsersThreeIcon from 'phosphor-svelte/lib/UsersThreeIcon';
	import WalletIcon from 'phosphor-svelte/lib/WalletIcon';

	import { resolve } from '$app/paths';
	import { PUBLIC_APP_URL } from '$lib/public-env';
	import { MESSAGES } from '$lib/i18n/messages';
	import type { Lang } from '../../params/lang';

	let { data } = $props();

	const t = $derived(MESSAGES[data.lang as Lang]);

	// Mesma ordem dos ícones em todos os idiomas — o texto vem de t.home.features.
	const FEATURE_ICONS = [
		WalletIcon,
		CalculatorIcon,
		UsersThreeIcon,
		FileArrowUpIcon,
		ChatCircleIcon,
		ArrowsLeftRightIcon
	];
</script>

<svelte:head>
	<title>Marcelus — {t.home.title} {t.home.titleHighlight}</title>
	<meta name="description" content={t.home.subtitle} />
</svelte:head>

<section class="mx-auto max-w-5xl px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
	<h1 class="font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
		{t.home.title}
		<span class="block text-primary italic">{t.home.titleHighlight}</span>
	</h1>
	<p class="mx-auto mt-8 max-w-xl text-lg text-muted-foreground">
		{t.home.subtitle}
	</p>
	<div class="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row">
		<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio), resolve() é só pra rotas internas -->
		<a
			href="{PUBLIC_APP_URL}/register"
			class="bg-foreground px-8 py-3.5 text-sm font-medium tracking-wide text-background uppercase transition-opacity hover:opacity-85"
		>
			{t.home.ctaPrimary}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
		<a
			href="{PUBLIC_APP_URL}/login"
			class="border border-foreground/30 px-8 py-3.5 text-sm font-medium tracking-wide uppercase transition-colors hover:border-foreground hover:bg-accent"
		>
			{t.home.ctaSecondary}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</section>

<section class="border-y border-border">
	<div class="mx-auto max-w-5xl px-6">
		{#each t.home.features as feature, i (feature.title)}
			{@const Icon = FEATURE_ICONS[i]}
			<div
				class="group flex flex-col gap-4 border-b border-border py-10 transition-colors last:border-b-0 sm:flex-row sm:items-baseline sm:gap-12 sm:py-12"
			>
				<div class="flex shrink-0 items-center gap-3 sm:w-72">
					<Icon size={20} weight="light" class="text-brand-dark" />
					<h2 class="font-display text-xl tracking-tight">{feature.title}</h2>
				</div>
				<p class="max-w-xl text-muted-foreground">{feature.description}</p>
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
