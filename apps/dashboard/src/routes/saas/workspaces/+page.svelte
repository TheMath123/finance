<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Select } from '$lib/components/ui/select';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import { formatCents } from '$lib/money';
	import type { AdminWorkspaceView } from '$lib/server/admin-api';

	let { data, form } = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));

	let changingPlan = $state<AdminWorkspaceView | null>(null);
	let changingPlanError = $state<string | null>(null);
	let selectedPlanId = $state('');

	const INTERVAL_LABELS: Record<string, string> = {
		day: 'dia',
		week: 'semana',
		month: 'mês',
		year: 'ano'
	};

	const INTERVAL_LABELS_PLURAL: Record<string, string> = {
		day: 'dias',
		week: 'semanas',
		month: 'meses',
		year: 'anos'
	};

	const selectedPlanPrices = $derived(
		data.plans.find((p) => p.id === selectedPlanId)?.prices ?? []
	);
	const planOptions = $derived(
		data.plans.map((plan) => ({
			value: plan.id,
			label: `${plan.name}${plan.isPrivate ? ' (privado)' : ''}${plan.trialDays > 0 ? ` (trial ${plan.trialDays}d)` : ''}`
		}))
	);
	const planPriceOptions = $derived(
		selectedPlanPrices.map((price) => ({
			value: price.id,
			label: `${formatCents(price.priceCents)} / ${INTERVAL_LABELS[price.billingIntervalUnit]}`
		}))
	);
	const defaultPlanPriceId = $derived(
		selectedPlanPrices.find((price) => price.isDefault)?.id ?? selectedPlanPrices[0]?.id ?? ''
	);

	function recurrenceLabel(workspace: AdminWorkspaceView): string {
		if (!workspace.planPrice) return workspace.plan.name;
		const interval =
			workspace.planPrice.billingIntervalCount > 1
				? `a cada ${workspace.planPrice.billingIntervalCount} ${INTERVAL_LABELS_PLURAL[workspace.planPrice.billingIntervalUnit]}`
				: INTERVAL_LABELS[workspace.planPrice.billingIntervalUnit];
		return `${workspace.plan.name} — ${interval}`;
	}

	function trialLabel(trialEndsAt: string): string {
		const date = new Date(trialEndsAt);
		const isExpired = date.getTime() < Date.now();
		const formatted = date.toLocaleDateString('pt-BR');
		return isExpired ? `trial venceu em ${formatted}` : `trial até ${formatted}`;
	}

	function openChangePlan(workspace: AdminWorkspaceView) {
		changingPlanError = null;
		changingPlan = workspace;
		selectedPlanId = workspace.plan.id;
	}
</script>

<svelte:head>
	<title>Workspaces — SaaS</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold">Workspaces</h1>
		<p class="text-sm text-muted-foreground">{data.total} no total</p>
	</div>

	<form method="GET" class="flex gap-2">
		<Input type="search" name="q" value={data.search} placeholder="Buscar por nome" />
		<Button type="submit">Buscar</Button>
	</form>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="flex flex-col gap-2">
		{#each data.workspaces as workspace (workspace.id)}
			<div
				class="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 px-4 py-3"
			>
				<div class="min-w-0">
					<p class="truncate text-sm font-medium">{workspace.name}</p>
					<p class="truncate text-sm text-muted-foreground">
						{workspace.ownerName ?? 'Sem dono'}
						{workspace.ownerEmail ? `(${workspace.ownerEmail})` : ''}
						· {workspace.memberCount} membro(s)
					</p>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					{#if workspace.trialEndsAt}
						<span class="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
							{trialLabel(workspace.trialEndsAt)}
						</span>
						<form method="POST" action="?/confirmPayment" use:enhance>
							<input type="hidden" name="workspaceId" value={workspace.id} />
							<Button type="submit" variant="outline" size="sm">Confirmar pagamento</Button>
						</form>
					{/if}
					<span class="rounded-full bg-foreground/5 px-2 py-1 text-xs text-muted-foreground">
						{recurrenceLabel(workspace)}
					</span>
					<Button variant="outline" size="sm" onclick={() => openChangePlan(workspace)}>
						Mudar plano
					</Button>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum workspace encontrado.</p>
		{/each}
	</div>

	{#if totalPages > 1}
		<div class="flex items-center justify-center gap-2">
			<form method="GET">
				<input type="hidden" name="q" value={data.search} />
				<input type="hidden" name="page" value={data.page - 1} />
				<Button type="submit" variant="outline" size="sm" disabled={data.page <= 1}>
					Anterior
				</Button>
			</form>
			<span class="text-sm text-muted-foreground">Página {data.page} de {totalPages}</span>
			<form method="GET">
				<input type="hidden" name="q" value={data.search} />
				<input type="hidden" name="page" value={data.page + 1} />
				<Button type="submit" variant="outline" size="sm" disabled={data.page >= totalPages}>
					Próxima
				</Button>
			</form>
		</div>
	{/if}
</div>

<Dialog.Root
	open={changingPlan !== null}
	onOpenChange={(open) => {
		if (!open) {
			changingPlan = null;
			changingPlanError = null;
		}
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Mudar plano — {changingPlan?.name}</Dialog.Title>
		</Dialog.Header>
		{#if changingPlanError}
			<p class="text-sm text-destructive">{changingPlanError}</p>
		{/if}
		{#if changingPlan}
			<form
				method="POST"
				action="?/setPlan"
				class="grid gap-4"
				use:enhance={dialogFormSubmit({
					onSuccess: () => {
						changingPlan = null;
						changingPlanError = null;
					},
					onError: (message) => {
						changingPlanError = message;
					}
				})}
			>
				<input type="hidden" name="workspaceId" value={changingPlan.id} />
				<Select name="planId" options={planOptions} bind:value={selectedPlanId} />
				{#if selectedPlanPrices.length > 0}
					<Select name="planPriceId" options={planPriceOptions} value={defaultPlanPriceId} />
				{/if}
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
