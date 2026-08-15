<script lang="ts">
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import CalculatorIcon from 'phosphor-svelte/lib/CalculatorIcon';
	import ChatCircleIcon from 'phosphor-svelte/lib/ChatCircleIcon';
	import FileArrowUpIcon from 'phosphor-svelte/lib/FileArrowUpIcon';
	import UsersThreeIcon from 'phosphor-svelte/lib/UsersThreeIcon';
	import WalletIcon from 'phosphor-svelte/lib/WalletIcon';

	import { resolve } from '$app/paths';
	import { PUBLIC_APP_URL } from '$env/static/public';
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

<section class="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
	<h1 class="text-4xl font-bold tracking-tight sm:text-6xl">
		{t.home.title} <span class="text-primary">{t.home.titleHighlight}</span>
	</h1>
	<p class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
		{t.home.subtitle}
	</p>
	<div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
		<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio), resolve() é só pra rotas internas -->
		<a
			href="{PUBLIC_APP_URL}/register"
			class="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
		>
			{t.home.ctaPrimary}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
		<a
			href="{PUBLIC_APP_URL}/login"
			class="rounded-lg border border-border px-6 py-3 font-medium transition-colors hover:bg-accent"
		>
			{t.home.ctaSecondary}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</section>

<section class="border-t border-border bg-card/50">
	<div class="mx-auto max-w-6xl px-6 py-20">
		<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
			{#each t.home.features as feature, i (feature.title)}
				{@const Icon = FEATURE_ICONS[i]}
				<div class="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
					<span
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
						<Icon size={22} weight="bold" />
					</span>
					<h2 class="font-semibold">{feature.title}</h2>
					<p class="text-sm text-muted-foreground">{feature.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="mx-auto max-w-6xl px-6 py-20 text-center">
	<h2 class="text-2xl font-semibold sm:text-3xl">{t.home.bannerTitle}</h2>
	<p class="mx-auto mt-3 max-w-xl text-muted-foreground">
		{t.home.bannerSubtitle}
	</p>
	<div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
		<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
		<a
			href="{PUBLIC_APP_URL}/register"
			class="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
		>
			{t.home.ctaPrimary}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
		<a
			href={resolve(`/${data.lang}/pricing`)}
			class="rounded-lg border border-border px-6 py-3 font-medium transition-colors hover:bg-accent"
		>
			{t.home.bannerSecondary}
		</a>
	</div>
</section>
