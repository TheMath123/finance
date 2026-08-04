<script lang="ts">
	import { enhance } from '$app/forms';

	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { formatCents } from '$lib/money';
	import type { PlanPriceView, PlanView } from '$lib/server/workspace-api';

	let { data, form } = $props();

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
	const currentPlanId = $derived(data.billing?.plan.id ?? null);

	// Free não entra aqui — segue representado só no card de status acima. Catálogo pago
	// confirmado em no máximo 3 planos, por isso a grade de cards (não dropdown) abaixo.
	const paidPlans = $derived(data.plans.filter((p: PlanView) => p.prices.length > 0));

	let selectedPriceByPlan = $state<Record<string, string>>({});

	function defaultPriceId(plan: PlanView): string {
		return plan.prices.find((price) => price.isDefault)?.id ?? plan.prices[0]?.id ?? '';
	}

	function selectedPrice(plan: PlanView): PlanPriceView | undefined {
		const priceId = selectedPriceByPlan[plan.id] ?? defaultPriceId(plan);
		return plan.prices.find((price) => price.id === priceId);
	}

	function intervalLabel(price: PlanPriceView): string {
		return price.billingIntervalCount > 1
			? `a cada ${price.billingIntervalCount} ${INTERVAL_LABELS[price.billingIntervalUnit]}s`
			: `por ${INTERVAL_LABELS[price.billingIntervalUnit]}`;
	}

	function priceLabel(price: PlanPriceView): string {
		return `${formatCents(price.priceCents)} ${intervalLabel(price)}`;
	}

	/** Feature flags não têm rótulo próprio ainda (só a chave cadastrada no superadmin) — formatação mecânica, sem inventar texto. */
	function featureLabel(key: string): string {
		return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('pt-BR');
	}
</script>

<svelte:head>
	<title>Assinatura — Marcelus</title>
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
				<Card.Footer class="flex flex-col items-start gap-2">
					<form method="POST" action="?/portal" use:enhance>
						<Button type="submit" class="min-h-11">Gerenciar assinatura</Button>
					</form>
					<p class="text-xs text-muted-foreground">
						Trocar de plano ou voltar pro Free se faz cancelando a assinatura por ali. Cancelamento
						não tem reembolso, exceto dentro dos primeiros 7 dias após a assinatura.
					</p>
				</Card.Footer>
			{/if}
		</Card.Root>
	{/if}

	{#if paidPlans.length > 0}
		<div class="flex flex-col gap-3">
			<div>
				<h2 class="text-base font-semibold">
					{hasSubscription ? 'Planos disponíveis' : 'Assinar um plano'}
				</h2>
				<p class="text-sm text-muted-foreground">
					{hasSubscription
						? 'Pra trocar de plano ou cancelar, use "Gerenciar assinatura" acima.'
						: 'Escolha um plano pago pra desbloquear mais limites.'}
				</p>
			</div>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each paidPlans as plan (plan.id)}
					{@const price = selectedPrice(plan)}
					{@const isCurrentPlan = plan.id === currentPlanId}
					{@const locked = hasSubscription}
					<Card.Root class="flex flex-col {isCurrentPlan ? 'ring-2 ring-primary' : ''}">
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								{plan.name}
								{#if isCurrentPlan}
									<Badge>Plano atual</Badge>
								{/if}
							</Card.Title>
							{#if plan.description}
								<Card.Description>{plan.description}</Card.Description>
							{/if}
						</Card.Header>
						<Card.Content class="flex flex-1 flex-col gap-4">
							{#if plan.trialDays > 0 && !hasSubscription}
								<Badge variant="secondary" class="w-fit">{plan.trialDays} dias grátis</Badge>
							{/if}

							<div class="flex flex-wrap gap-1.5">
								<Badge variant="outline">
									{plan.limits.maxOwnedSharedWorkspaces} workspace(s)
								</Badge>
								<Badge variant="outline">{plan.limits.maxMembersPerWorkspace} membro(s)</Badge>
								<Badge variant="outline">
									{plan.limits.maxSavedFormulasPerWorkspace} fórmula(s)
								</Badge>
								{#each plan.features as feature (feature)}
									<Badge variant="outline">{featureLabel(feature)}</Badge>
								{/each}
							</div>

							<form
								method="POST"
								action="?/checkout"
								class="mt-auto flex flex-col gap-3"
								use:enhance
							>
								<input type="hidden" name="planId" value={plan.id} />
								<input type="hidden" name="planPriceId" value={price?.id ?? ''} />

								{#if plan.prices.length > 1}
									<fieldset class="flex flex-col gap-1.5" disabled={locked}>
										<legend class="mb-0.5 text-xs font-medium text-muted-foreground">
											Cobrança
										</legend>
										<div class="flex flex-wrap gap-1.5">
											{#each plan.prices as candidate (candidate.id)}
												{@const inputId = `price-${candidate.id}`}
												<span class="relative">
													<input
														type="radio"
														id={inputId}
														name={`price-group-${plan.id}`}
														class="peer sr-only"
														disabled={locked}
														checked={candidate.id ===
															(selectedPriceByPlan[plan.id] ?? defaultPriceId(plan))}
														onchange={() => (selectedPriceByPlan[plan.id] = candidate.id)}
													/>
													<label
														for={inputId}
														class="flex min-h-11 items-center rounded-lg border border-foreground/10 px-3 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50 {locked
															? ''
															: 'cursor-pointer'}"
													>
														{priceLabel(candidate)}
													</label>
												</span>
											{/each}
										</div>
									</fieldset>
								{:else if price}
									<p class="text-2xl font-semibold">{priceLabel(price)}</p>
								{/if}

								<Button type="submit" class="min-h-11 w-full" disabled={!price || locked}>
									{isCurrentPlan ? 'Plano atual' : 'Assinar'}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}
</div>
