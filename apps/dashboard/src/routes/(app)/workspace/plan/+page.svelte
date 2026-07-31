<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { formatCents } from '$lib/money';
	import type { PlanPriceView, PlanView } from '$lib/server/workspace-api';

	let { data, form } = $props();

	let selectedPlanId = $state(data.plans[0]?.id ?? '');

	const INTERVAL_LABELS: Record<string, string> = {
		day: 'dia',
		week: 'semana',
		month: 'mês',
		year: 'ano'
	};

	const STATUS_LABELS: Record<string, string> = {
		none: 'Sem assinatura',
		trialing: 'Em trial',
		active: 'Ativa',
		past_due: 'Pagamento atrasado',
		canceled: 'Cancelada',
		incomplete: 'Incompleta'
	};

	const hasSubscription = $derived(data.billing?.hasStripeCustomer ?? false);

	const selectedPlanPrices = $derived(
		data.plans.find((p: PlanView) => p.id === selectedPlanId)?.prices ?? []
	);

	function priceLabel(price: PlanPriceView): string {
		const interval =
			price.billingIntervalCount > 1
				? `a cada ${price.billingIntervalCount} ${INTERVAL_LABELS[price.billingIntervalUnit]}s`
				: INTERVAL_LABELS[price.billingIntervalUnit];
		return `${formatCents(price.priceCents)} / ${interval}`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('pt-BR');
	}
</script>

<svelte:head>
	<title>Assinatura — Finance</title>
</svelte:head>

<div class="flex flex-col gap-6">
	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	{#if data.billing}
		<Card.Root>
			<Card.Header>
				<Card.Title>{data.billing.plan.name}</Card.Title>
				<Card.Description>
					{STATUS_LABELS[data.billing.subscriptionStatus] ?? data.billing.subscriptionStatus}
					{#if data.billing.planPrice}
						· {priceLabel(data.billing.planPrice)}
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-1 text-sm text-muted-foreground">
				{#if data.billing.trialEndsAt}
					<p>Trial até {formatDate(data.billing.trialEndsAt)}</p>
				{/if}
				{#if data.billing.cancelAtPeriodEnd && data.billing.currentPeriodEndsAt}
					<p>Assinatura cancelada — acesso até {formatDate(data.billing.currentPeriodEndsAt)}</p>
				{/if}
				<p>
					{data.billing.plan.limits.maxOwnedSharedWorkspaces} workspace(s) compartilhado(s) ·
					{data.billing.plan.limits.maxMembersPerWorkspace} membro(s) ·
					{data.billing.plan.limits.maxSavedFormulasPerWorkspace} fórmula(s) salva(s)
				</p>
			</Card.Content>
			{#if hasSubscription}
				<Card.Footer>
					<form method="POST" action="?/portal" use:enhance>
						<Button type="submit">Gerenciar assinatura</Button>
					</form>
				</Card.Footer>
			{/if}
		</Card.Root>
	{/if}

	{#if !hasSubscription}
		<Card.Root>
			<Card.Header>
				<Card.Title>Assinar um plano</Card.Title>
				<Card.Description>Escolha um plano pago pra desbloquear mais limites.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/checkout" class="flex flex-col gap-3">
					<select
						name="planId"
						bind:value={selectedPlanId}
						class="h-9 rounded-lg border border-foreground/10 bg-background px-3 text-sm"
					>
						{#each data.plans as plan (plan.id)}
							<option value={plan.id}>{plan.name}</option>
						{/each}
					</select>
					{#if selectedPlanPrices.length > 0}
						<select
							name="planPriceId"
							class="h-9 rounded-lg border border-foreground/10 bg-background px-3 text-sm"
						>
							{#each selectedPlanPrices as price (price.id)}
								<option value={price.id} selected={price.isDefault}>
									{priceLabel(price)}
								</option>
							{/each}
						</select>
					{/if}
					<Button type="submit" disabled={selectedPlanPrices.length === 0}>Assinar</Button>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
