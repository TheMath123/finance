<script lang="ts">
	import { PUBLIC_APP_URL } from '$lib/public-env';
	import { MESSAGES } from '$lib/i18n/messages';
	import { formatCents } from '$lib/money';
	import type { PlanPriceView, PlanView } from '$lib/server/plans-api';
	import type { Lang } from '../../../params/lang';

	let { data } = $props();

	const t = $derived(MESSAGES[data.lang as Lang]);

	function defaultPrice(plan: PlanView): PlanPriceView | undefined {
		return plan.prices.find((price) => price.isDefault) ?? plan.prices[0];
	}

	function intervalUnitLabel(unit: PlanPriceView['billingIntervalUnit']): string {
		return {
			day: t.pricing.intervalDay,
			week: t.pricing.intervalWeek,
			month: t.pricing.intervalMonth,
			year: t.pricing.intervalYear
		}[unit];
	}

	function intervalLabel(price: PlanPriceView): string {
		const unit = intervalUnitLabel(price.billingIntervalUnit);
		return price.billingIntervalCount > 1
			? t.pricing.everyNIntervals(price.billingIntervalCount, unit)
			: t.pricing.perInterval(unit);
	}

	function featureLabel(key: string): string {
		return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
	}

	// Meses equivalentes de um intervalo de cobrança — base pra sempre exibir
	// o valor "por mês", mesmo quando o preço cobrado é semestral/anual.
	function monthsInInterval(price: PlanPriceView): number {
		switch (price.billingIntervalUnit) {
			case 'year':
				return price.billingIntervalCount * 12;
			case 'month':
				return price.billingIntervalCount;
			case 'week':
				return price.billingIntervalCount / 4.345;
			case 'day':
				return price.billingIntervalCount / 30.44;
		}
	}

	function monthlyEquivalentCents(price: PlanPriceView): number {
		return Math.round(price.priceCents / monthsInInterval(price));
	}

	// Preço mensal "cheio" do mesmo plano (se existir) — referência pra
	// calcular o desconto de planos semestrais/anuais.
	function monthlyReferencePrice(plan: PlanView): PlanPriceView | undefined {
		return plan.prices.find(
			(p) => p.billingIntervalUnit === 'month' && p.billingIntervalCount === 1
		);
	}

	function savingsPercent(plan: PlanView, price: PlanPriceView): number | null {
		const reference = monthlyReferencePrice(plan);
		if (!reference || reference.id === price.id || reference.priceCents <= 0) return null;
		const equivalent = monthlyEquivalentCents(price);
		if (equivalent >= reference.priceCents) return null;
		return Math.round((1 - equivalent / reference.priceCents) * 100);
	}

	// Sem plano nenhum vindo da API (falha de rede/backend fora do ar) — cai
	// pro card estático "Gratuito" como único fallback, em vez de mostrar uma
	// página de preços vazia. Com resposta normal da API, o próprio plano
	// gratuito já vem nela (com preço R$ 0) e a grade mostra só o que veio.
	const showFreeFallback = $derived(data.plans.length === 0);
</script>

<svelte:head>
	<title>{t.pricing.title} — Marcelus</title>
	<meta name="description" content={t.pricing.subtitle} />
</svelte:head>

<section class="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center sm:pt-32">
	<h1 class="font-display text-4xl tracking-tight sm:text-6xl">{t.pricing.title}</h1>
	<p class="mx-auto mt-5 max-w-xl text-muted-foreground">{t.pricing.subtitle}</p>
</section>

<section class="mx-auto max-w-5xl px-6 pb-28">
	<div class="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
		{#if showFreeFallback}
			<div class="flex flex-col gap-5 border border-border bg-background p-8">
				<div>
					<h2 class="font-display text-lg tracking-tight">{t.pricing.freeTitle}</h2>
					<p class="mt-1 text-sm text-muted-foreground">{t.pricing.freeDescription}</p>
				</div>
				<p class="mt-auto font-display text-3xl">{t.pricing.freePrice}</p>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
				<a
					href="{PUBLIC_APP_URL}/register"
					class="border border-foreground/30 px-5 py-3 text-center text-xs font-medium tracking-wide uppercase transition-colors hover:border-foreground hover:bg-accent"
				>
					{t.pricing.signupFree}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
		{/if}

		{#each data.plans as plan (plan.id)}
			{@const price = defaultPrice(plan)}
			<div class="flex flex-col gap-5 border border-border bg-background p-8">
				<div>
					<h2 class="font-display text-lg tracking-tight">{plan.name}</h2>
					{#if plan.description}
						<p class="mt-1 text-sm text-muted-foreground">{plan.description}</p>
					{/if}
				</div>

				{#if plan.trialDays > 0}
					<p
						class="w-fit border border-brand-dark/40 px-2 py-0.5 text-xs font-medium tracking-wide text-brand-dark uppercase"
					>
						{t.pricing.trialDays(plan.trialDays)}
					</p>
				{/if}

				<div
					class="flex flex-wrap gap-x-3 gap-y-1 text-xs tracking-wide text-muted-foreground uppercase"
				>
					<span>{t.pricing.workspaces(plan.limits.maxOwnedSharedWorkspaces)}</span>
					<span aria-hidden="true">·</span>
					<span>{t.pricing.members(plan.limits.maxMembersPerWorkspace)}</span>
					<span aria-hidden="true">·</span>
					<span>{t.pricing.formulas(plan.limits.maxSavedFormulasPerWorkspace)}</span>
					{#each plan.features as feature (feature)}
						<span aria-hidden="true">·</span>
						<span>{featureLabel(feature)}</span>
					{/each}
				</div>

				{#if price}
					{@const equivalentMonthly = monthlyEquivalentCents(price)}
					{@const savings = savingsPercent(plan, price)}
					{@const isMonthly =
						price.billingIntervalUnit === 'month' && price.billingIntervalCount === 1}
					<div class="mt-auto">
						<p class="font-display text-3xl">
							{formatCents(equivalentMonthly)}
							<span class="font-sans text-sm font-normal text-muted-foreground normal-case">
								{t.pricing.perInterval(t.pricing.intervalMonth)}
							</span>
						</p>
						{#if !isMonthly}
							<p class="mt-1 text-xs tracking-wide text-muted-foreground uppercase">
								{formatCents(price.priceCents)}
								{intervalLabel(price)}
								{#if savings !== null}
									<span class="text-brand-dark">· {t.pricing.savePercent(savings)}</span>
								{/if}
							</p>
						{/if}
					</div>
				{/if}

				<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
				<a
					href="{PUBLIC_APP_URL}/register"
					class="bg-foreground px-5 py-3 text-center text-xs font-medium tracking-wide text-background uppercase transition-opacity hover:opacity-85"
				>
					{t.pricing.subscribe}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
		{/each}
	</div>
</section>
