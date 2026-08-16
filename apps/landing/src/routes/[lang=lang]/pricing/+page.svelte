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

	// Free não tem preço (prices.length === 0) — representado à parte, fora da grade paga.
	const paidPlans = $derived(data.plans.filter((p: PlanView) => p.prices.length > 0));
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
	<div class="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
		<div class="flex flex-col gap-5 bg-background p-8">
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

		{#each paidPlans as plan (plan.id)}
			{@const price = defaultPrice(plan)}
			<div class="flex flex-col gap-5 bg-background p-8">
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
					<p class="mt-auto font-display text-3xl">
						{formatCents(price.priceCents)}
						<span class="font-sans text-sm font-normal text-muted-foreground normal-case">
							{intervalLabel(price)}
						</span>
					</p>
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
