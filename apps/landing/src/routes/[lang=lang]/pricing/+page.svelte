<script lang="ts">
	import { PUBLIC_APP_URL } from '$env/static/public';
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

	// Free não tem preço (prices.length === 0) — representado à parte, fora da grade paga.
	const paidPlans = $derived(data.plans.filter((p: PlanView) => p.prices.length > 0));
</script>

<svelte:head>
	<title>{t.pricing.title} — Marcelus</title>
	<meta name="description" content={t.pricing.subtitle} />
</svelte:head>

<section class="mx-auto max-w-6xl px-6 py-20 text-center">
	<h1 class="text-3xl font-bold sm:text-5xl">{t.pricing.title}</h1>
	<p class="mx-auto mt-4 max-w-xl text-muted-foreground">{t.pricing.subtitle}</p>
</section>

<section class="mx-auto max-w-6xl px-6 pb-24">
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<div class="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
			<div>
				<h2 class="font-semibold">{t.pricing.freeTitle}</h2>
				<p class="text-sm text-muted-foreground">{t.pricing.freeDescription}</p>
			</div>
			<p class="mt-auto text-2xl font-semibold">{t.pricing.freePrice}</p>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
			<a
				href="{PUBLIC_APP_URL}/register"
				class="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
			>
				{t.pricing.signupFree}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>

		{#each paidPlans as plan (plan.id)}
			{@const price = defaultPrice(plan)}
			<div class="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
				<div>
					<h2 class="font-semibold">{plan.name}</h2>
					{#if plan.description}
						<p class="text-sm text-muted-foreground">{plan.description}</p>
					{/if}
				</div>

				{#if plan.trialDays > 0}
					<span
						class="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
					>
						{t.pricing.trialDays(plan.trialDays)}
					</span>
				{/if}

				<div class="flex flex-wrap gap-1.5">
					<span class="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
						{t.pricing.workspaces(plan.limits.maxOwnedSharedWorkspaces)}
					</span>
					<span class="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
						{t.pricing.members(plan.limits.maxMembersPerWorkspace)}
					</span>
					<span class="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
						{t.pricing.formulas(plan.limits.maxSavedFormulasPerWorkspace)}
					</span>
					{#each plan.features as feature (feature)}
						<span
							class="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
						>
							{featureLabel(feature)}
						</span>
					{/each}
				</div>

				{#if price}
					<p class="mt-auto text-2xl font-semibold">
						{formatCents(price.priceCents)}
						<span class="text-sm font-normal text-muted-foreground">{intervalLabel(price)}</span>
					</p>
				{/if}

				<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
				<a
					href="{PUBLIC_APP_URL}/register"
					class="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
				>
					{t.pricing.subscribe}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
		{/each}
	</div>
</section>
