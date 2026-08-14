<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import { formatCents } from '$lib/money';
	import type { PaymentMethod, PlanPriceView, PlanView } from '$lib/server/admin-api';

	let { data, form } = $props();

	// Chegando de "Criar plano privado" (tela de Workspaces) — pré-abre o
	// dialog de criação já no modo privado, vinculado a este workspace.
	const forWorkspaceId = $derived(page.url.searchParams.get('forWorkspaceId'));
	const forWorkspaceName = $derived(page.url.searchParams.get('forWorkspaceName'));

	let createOpen = $state(false);
	let createError = $state<string | null>(null);

	$effect(() => {
		if (forWorkspaceId) createOpen = true;
	});
	let editing = $state<PlanView | null>(null);
	let editError = $state<string | null>(null);
	let priceDialogPlan = $state<PlanView | null>(null);
	let editingPrice = $state<PlanPriceView | null>(null);
	let priceError = $state<string | null>(null);

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

	const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
		credit_card: 'Cartão de crédito',
		debit_card: 'Cartão de débito',
		pix: 'Pix'
	};

	function priceLabel(price: PlanPriceView): string {
		const interval =
			price.billingIntervalCount > 1
				? `a cada ${price.billingIntervalCount} ${INTERVAL_LABELS_PLURAL[price.billingIntervalUnit]}`
				: INTERVAL_LABELS[price.billingIntervalUnit];
		return `${formatCents(price.priceCents)} / ${interval}`;
	}

	function openAddPrice(plan: PlanView) {
		priceError = null;
		priceDialogPlan = plan;
		editingPrice = null;
	}

	function openEditPrice(plan: PlanView, price: PlanPriceView) {
		priceError = null;
		priceDialogPlan = plan;
		editingPrice = price;
	}
</script>

<svelte:head>
	<title>Planos — SaaS</title>
</svelte:head>

{#snippet planFields(plan?: PlanView, hideKey = false)}
	{#if !plan && !hideKey}
		<div class="grid gap-2">
			<Label for="key">Chave</Label>
			<Input id="key" name="key" placeholder="premium" required />
		</div>
	{/if}
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="grid gap-2">
			<Label for="name">Nome</Label>
			<Input id="name" name="name" value={plan?.name ?? ''} required />
		</div>
		<div class="grid gap-2">
			<Label for="trialDays">Dias de trial (0 = sem trial)</Label>
			<Input
				id="trialDays"
				name="trialDays"
				type="number"
				min="0"
				value={plan?.trialDays ?? 0}
				required
			/>
		</div>
	</div>
	<div class="grid gap-2">
		<Label for="description">Descrição</Label>
		<Input id="description" name="description" value={plan?.description ?? ''} />
	</div>
	{#if plan?.restrictedToWorkspaceId}
		<label class="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
			<input type="checkbox" name="makePublic" />
			Tornar público (remove o vínculo privado com {plan.restrictedToWorkspaceName ??
				plan.restrictedToWorkspaceId})
		</label>
	{/if}
	<div class="grid gap-2 rounded-lg border border-foreground/10 p-3">
		<p class="text-xs font-medium text-muted-foreground">Limites</p>
		<div class="grid gap-3 sm:grid-cols-3">
			<div class="grid gap-1">
				<Label for="maxOwnedSharedWorkspaces" class="text-xs">Workspaces compartilhados</Label>
				<Input
					id="maxOwnedSharedWorkspaces"
					name="maxOwnedSharedWorkspaces"
					type="number"
					min="0"
					value={plan?.limits.maxOwnedSharedWorkspaces ?? 1}
					required
				/>
			</div>
			<div class="grid gap-1">
				<Label for="maxMembersPerWorkspace" class="text-xs">Membros por workspace</Label>
				<Input
					id="maxMembersPerWorkspace"
					name="maxMembersPerWorkspace"
					type="number"
					min="1"
					value={plan?.limits.maxMembersPerWorkspace ?? 5}
					required
				/>
			</div>
			<div class="grid gap-1">
				<Label for="maxSavedFormulasPerWorkspace" class="text-xs">Fórmulas salvas</Label>
				<Input
					id="maxSavedFormulasPerWorkspace"
					name="maxSavedFormulasPerWorkspace"
					type="number"
					min="0"
					value={plan?.limits.maxSavedFormulasPerWorkspace ?? 10}
					required
				/>
			</div>
		</div>
	</div>
	<div class="grid gap-2 rounded-lg border border-foreground/10 p-3">
		<p class="text-xs font-medium text-muted-foreground">
			Features liberadas (baseado nas feature flags cadastradas)
		</p>
		{#if data.featureFlags.length === 0}
			<p class="text-xs text-muted-foreground">
				Nenhuma feature flag cadastrada ainda — crie em "Feature flags" antes de travar por plano.
			</p>
		{/if}
		<div class="grid gap-1 sm:grid-cols-2">
			{#each data.featureFlags as flag (flag.key)}
				<label class="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						name="features"
						value={flag.key}
						checked={plan?.features.includes(flag.key) ?? false}
					/>
					{flag.key}
				</label>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet priceFields(price?: PlanPriceView)}
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="grid gap-2">
			<Label for="billingIntervalUnit">Intervalo</Label>
			<select
				id="billingIntervalUnit"
				name="billingIntervalUnit"
				value={price?.billingIntervalUnit ?? 'month'}
				class="h-9 rounded-lg border border-foreground/10 bg-background px-3 text-sm"
			>
				<option value="day">Dia</option>
				<option value="week">Semana</option>
				<option value="month">Mês</option>
				<option value="year">Ano</option>
			</select>
		</div>
		<div class="grid gap-2">
			<Label for="billingIntervalCount">A cada quantos</Label>
			<Input
				id="billingIntervalCount"
				name="billingIntervalCount"
				type="number"
				min="1"
				value={price?.billingIntervalCount ?? 1}
				required
			/>
		</div>
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="grid gap-2">
			<Label for="priceCents">Preço (R$)</Label>
			<Input
				id="priceCents"
				name="priceCents"
				value={price ? (price.priceCents / 100).toFixed(2).replace('.', ',') : ''}
				placeholder="0,00"
				required
			/>
		</div>
		<div class="grid gap-2">
			<Label for="maxInstallments">Parcelas máx. (cartão)</Label>
			<Input
				id="maxInstallments"
				name="maxInstallments"
				type="number"
				min="1"
				max="12"
				value={price?.maxInstallments ?? 1}
				required
			/>
		</div>
	</div>
	<div class="grid gap-1">
		<Label class="text-xs">Métodos de pagamento aceitos</Label>
		{#each Object.entries(PAYMENT_METHOD_LABELS) as [value, label] (value)}
			<label class="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					name="paymentMethods"
					{value}
					checked={price?.paymentMethods.includes(value as PaymentMethod) ?? true}
				/>
				{label}
			</label>
		{/each}
	</div>
	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" name="isDefault" checked={price?.isDefault ?? false} />
		Opção padrão (pré-selecionada)
	</label>
{/snippet}

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold">Planos</h1>
		<Button
			onclick={() => {
				createError = null;
				createOpen = true;
			}}>Novo plano</Button
		>
	</div>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="grid gap-2 sm:grid-cols-2">
		{#each data.plans as plan (plan.id)}
			<div
				class="flex flex-col gap-3 rounded-lg border border-foreground/10 p-4 {plan.isActive
					? ''
					: 'opacity-60'}"
			>
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="text-sm font-medium">
							{plan.name}
							<span class="text-xs text-muted-foreground">({plan.key})</span>
							{#if !plan.isActive}
								<span class="text-xs text-destructive">(inativo)</span>
							{/if}
						</p>
						{#if plan.restrictedToWorkspaceId}
							<p class="text-xs text-primary">
								Privado: {plan.restrictedToWorkspaceName ?? plan.restrictedToWorkspaceId}
							</p>
						{/if}
						{#if plan.trialDays > 0}
							<p class="text-xs text-primary">{plan.trialDays} dias de trial</p>
						{/if}
					</div>
					<Button
						variant="outline"
						size="sm"
						onclick={() => {
							editError = null;
							editing = plan;
						}}>Editar</Button
					>
				</div>

				<div class="flex flex-col gap-1">
					{#each plan.prices as price (price.id)}
						<div
							class="flex items-center justify-between gap-2 rounded-md bg-foreground/5 px-2 py-1 text-xs"
						>
							<span>
								{priceLabel(price)}
								{#if price.isDefault}<span class="text-primary">(padrão)</span>{/if}
							</span>
							<div class="flex shrink-0 gap-1">
								<button
									type="button"
									class="text-muted-foreground underline"
									onclick={() => openEditPrice(plan, price)}
								>
									editar
								</button>
								<form method="POST" action="?/deletePrice" use:enhance>
									<input type="hidden" name="planId" value={plan.id} />
									<input type="hidden" name="priceId" value={price.id} />
									<button type="submit" class="text-destructive underline">excluir</button>
								</form>
							</div>
						</div>
					{:else}
						<p class="text-xs text-muted-foreground">Nenhuma opção de cobrança ainda.</p>
					{/each}
					<button
						type="button"
						class="self-start text-xs text-primary underline"
						onclick={() => openAddPrice(plan)}
					>
						+ Adicionar preço
					</button>
				</div>

				<div class="flex flex-wrap gap-1 text-xs text-muted-foreground">
					<span class="rounded-full bg-foreground/5 px-2 py-0.5">
						{plan.limits.maxOwnedSharedWorkspaces} workspace(s)
					</span>
					<span class="rounded-full bg-foreground/5 px-2 py-0.5">
						{plan.limits.maxMembersPerWorkspace} membro(s)
					</span>
					<span class="rounded-full bg-foreground/5 px-2 py-0.5">
						{plan.limits.maxSavedFormulasPerWorkspace} fórmula(s)
					</span>
					{#each plan.features as feature (feature)}
						<span class="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{feature}</span>
					{/each}
				</div>
				<form
					method="POST"
					action={plan.isActive ? '?/deactivate' : '?/activate'}
					use:enhance
					class="self-start"
				>
					<input type="hidden" name="id" value={plan.id} />
					<Button type="submit" variant={plan.isActive ? 'destructive' : 'default'} size="sm">
						{plan.isActive ? 'Desativar' : 'Ativar'}
					</Button>
				</form>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
		{/each}
	</div>
</div>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{forWorkspaceId ? 'Novo plano privado' : 'Novo plano'}</Dialog.Title>
		</Dialog.Header>
		{#if forWorkspaceId}
			<p class="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
				Criando plano privado para <strong>{forWorkspaceName ?? forWorkspaceId}</strong> — não aparece
				no catálogo público e só vale pra este workspace.
			</p>
		{/if}
		{#if createError}
			<p class="text-sm text-destructive">{createError}</p>
		{/if}
		<form
			method="POST"
			action="?/create"
			class="grid gap-4"
			use:enhance={dialogFormSubmit({
				onSuccess: () => {
					createOpen = false;
					createError = null;
				},
				onError: (message) => {
					createError = message;
				}
			})}
		>
			{#if forWorkspaceId}
				<input type="hidden" name="forWorkspaceId" value={forWorkspaceId} />
			{/if}
			{@render planFields(undefined, !!forWorkspaceId)}
			{#if forWorkspaceId}
				<div class="grid gap-2 rounded-lg border border-foreground/10 p-3">
					<p class="text-xs font-medium text-muted-foreground">Preço</p>
					{@render priceFields()}
				</div>
			{/if}
			<Dialog.Footer>
				<Button type="submit">Criar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root
	open={editing !== null}
	onOpenChange={(open) => {
		if (!open) {
			editing = null;
			editError = null;
		}
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Editar plano</Dialog.Title>
		</Dialog.Header>
		{#if editError}
			<p class="text-sm text-destructive">{editError}</p>
		{/if}
		{#if editing}
			<form
				method="POST"
				action="?/update"
				class="grid gap-4"
				use:enhance={dialogFormSubmit({
					onSuccess: () => {
						editing = null;
						editError = null;
					},
					onError: (message) => {
						editError = message;
					}
				})}
			>
				<input type="hidden" name="id" value={editing.id} />
				{@render planFields(editing)}
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root
	open={priceDialogPlan !== null}
	onOpenChange={(open) => {
		if (!open) {
			priceDialogPlan = null;
			editingPrice = null;
			priceError = null;
		}
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{editingPrice ? 'Editar preço' : 'Adicionar preço'}</Dialog.Title>
		</Dialog.Header>
		{#if priceError}
			<p class="text-sm text-destructive">{priceError}</p>
		{/if}
		{#if priceDialogPlan}
			<form
				method="POST"
				action={editingPrice ? '?/updatePrice' : '?/addPrice'}
				class="grid gap-4"
				use:enhance={dialogFormSubmit({
					onSuccess: () => {
						priceDialogPlan = null;
						editingPrice = null;
						priceError = null;
					},
					onError: (message) => {
						priceError = message;
					}
				})}
			>
				<input type="hidden" name="planId" value={priceDialogPlan.id} />
				{#if editingPrice}
					<input type="hidden" name="priceId" value={editingPrice.id} />
				{/if}
				{@render priceFields(editingPrice ?? undefined)}
				<Dialog.Footer>
					<Button type="submit">{editingPrice ? 'Salvar' : 'Adicionar'}</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
