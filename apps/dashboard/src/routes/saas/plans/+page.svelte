<script lang="ts">
	import InfoIcon from 'phosphor-svelte/lib/InfoIcon';
	import { SvelteSet } from 'svelte/reactivity';

	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import { formatCents } from '$lib/money';
	import type { PaymentMethod, PlanPriceView, PlanView } from '$lib/server/admin-api';

	let { data, form } = $props();

	let createOpen = $state(false);
	let createError = $state<string | null>(null);
	let editing = $state<PlanView | null>(null);
	let editError = $state<string | null>(null);
	let priceDialogPlan = $state<PlanView | null>(null);
	let editingPrice = $state<PlanPriceView | null>(null);
	let priceError = $state<string | null>(null);
	// Reativo pra deixar o rótulo de "a cada quantos" explícito na unidade
	// escolhida (dias/semanas/meses/anos), em vez de um "quantos" genérico.
	let billingIntervalUnit = $state<'day' | 'week' | 'month' | 'year'>('month');
	const BILLING_INTERVAL_OPTIONS = [
		{ value: 'day', label: 'Dia' },
		{ value: 'week', label: 'Semana' },
		{ value: 'month', label: 'Mês' },
		{ value: 'year', label: 'Ano' }
	];
	// Selecionadas separado da lista filtrada — senão marcar uma feature e
	// depois filtrar ela pra fora da busca perderia a seleção no submit
	// (checkbox some do DOM, valor não vai junto).
	// SvelteSet já é reativo por si só (mutação in-place) — nunca reatribuir
	// a variável (ver ESLint svelte/no-unnecessary-state-wrap), sempre
	// `.clear()` + `.add(...)` pra resetar/preencher.
	const selectedFeatures = new SvelteSet<string>();
	let featureSearch = $state('');

	// Mesma técnica de normalização usada em +page.server.ts (slugify) — tira
	// acento pra busca funcionar digitando sem acentuação.
	const DIACRITICS_PATTERN = /[̀-ͯ]/g;
	function normalize(text: string): string {
		return text.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase();
	}

	const filteredFeatureFlags = $derived.by(() => {
		const query = normalize(featureSearch.trim());
		if (!query) return data.featureFlags;
		return data.featureFlags.filter(
			(flag) => normalize(flag.title).includes(query) || normalize(flag.key).includes(query)
		);
	});

	function toggleFeature(key: string, checked: boolean) {
		if (checked) selectedFeatures.add(key);
		else selectedFeatures.delete(key);
	}

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

	// "quantas" (feminino) só pra semana — o resto usa "quantos" (masculino).
	const INTERVAL_COUNT_LABELS: Record<string, string> = {
		day: 'quantos dias',
		week: 'quantas semanas',
		month: 'quantos meses',
		year: 'quantos anos'
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
		billingIntervalUnit = 'month';
	}

	function openEditPrice(plan: PlanView, price: PlanPriceView) {
		priceError = null;
		priceDialogPlan = plan;
		editingPrice = price;
		billingIntervalUnit = price.billingIntervalUnit;
	}
</script>

<svelte:head>
	<title>Planos — SaaS</title>
</svelte:head>

{#snippet planFields(plan?: PlanView)}
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
	<label class="flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-2 text-sm">
		<input type="checkbox" name="isPublic" checked={!(plan?.isPrivate ?? false)} />
		Público
		<Tooltip.Root>
			<Tooltip.Trigger>
				<InfoIcon size={14} class="text-muted-foreground" />
			</Tooltip.Trigger>
			<Tooltip.Content>
				Marcado: o plano aparece no catálogo e qualquer workspace pode assiná-lo por conta própria.
				Desmarcado: o plano fica privado — só o superadmin vincula manualmente a um workspace, em
				"Workspaces".
			</Tooltip.Content>
		</Tooltip.Root>
	</label>
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
		{:else}
			<Input
				type="search"
				placeholder="Buscar feature..."
				bind:value={featureSearch}
				class="h-8 text-sm"
			/>
			<div class="grid gap-1 sm:grid-cols-2">
				{#each filteredFeatureFlags as flag (flag.key)}
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={selectedFeatures.has(flag.key)}
							onchange={(e) => toggleFeature(flag.key, e.currentTarget.checked)}
						/>
						{flag.title}
						{#if flag.description}
							<Tooltip.Root>
								<Tooltip.Trigger>
									<InfoIcon size={14} class="text-muted-foreground" />
								</Tooltip.Trigger>
								<Tooltip.Content>{flag.description}</Tooltip.Content>
							</Tooltip.Root>
						{/if}
					</label>
				{:else}
					<p class="text-xs text-muted-foreground sm:col-span-2">
						Nenhuma feature encontrada pra "{featureSearch}".
					</p>
				{/each}
			</div>
		{/if}
		{#each [...selectedFeatures] as key (key)}
			<input type="hidden" name="features" value={key} />
		{/each}
	</div>
{/snippet}

{#snippet priceFields(price?: PlanPriceView)}
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="grid gap-2">
			<Label for="billingIntervalUnit">Intervalo</Label>
			<Select
				id="billingIntervalUnit"
				name="billingIntervalUnit"
				options={BILLING_INTERVAL_OPTIONS}
				value={billingIntervalUnit}
				onValueChange={(v) => (billingIntervalUnit = v as typeof billingIntervalUnit)}
			/>
		</div>
		<div class="grid gap-2">
			<Label for="billingIntervalCount">A cada {INTERVAL_COUNT_LABELS[billingIntervalUnit]}</Label>
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
				featureSearch = '';
				selectedFeatures.clear();
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
						{#if plan.isPrivate}
							<p class="text-xs text-primary">Privado</p>
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
							featureSearch = '';
							selectedFeatures.clear();
							for (const key of plan.features) selectedFeatures.add(key);
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
			<Dialog.Title>Novo plano</Dialog.Title>
		</Dialog.Header>
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
			{@render planFields()}
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
