<script lang="ts">
	import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';

	import { enhance } from '$app/forms';

	import { resolveCategoryIcon } from '$lib/category-icon';
	import { Button } from '$lib/components/ui/button';
	import { ComboSelect } from '$lib/components/ui/combo-select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import { formatCents } from '$lib/money';
	import { MONTH_NAMES } from '$lib/month-names';
	import type { RecurringView } from '$lib/server/recurring-api';

	let { data, form } = $props();

	const canManage = $derived(
		data.activeWorkspace?.role === 'owner' || data.activeWorkspace?.role === 'admin'
	);

	const activeAccounts = $derived(data.accounts.filter((a) => !a.archivedAt));
	const activeCards = $derived(data.cards.filter((c) => !c.archivedAt));
	const categoryById = $derived(new Map(data.categories.map((c) => [c.id, c])));
	const accountById = $derived(new Map(data.accounts.map((a) => [a.id, a])));
	const cardById = $derived(new Map(data.cards.map((c) => [c.id, c])));

	const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

	function describeFrequency(r: RecurringView): string {
		if (r.frequency === 'weekly') return `Semanal, ${WEEKDAY_LABELS[r.dayOfReference]}`;
		if (r.frequency === 'yearly') {
			const month = r.monthOfReference ? MONTH_NAMES[r.monthOfReference - 1] : '—';
			return `Anual, ${r.dayOfReference} de ${month}`;
		}
		return `Mensal, dia ${r.dayOfReference}`;
	}

	function describeTarget(r: RecurringView): string {
		if (r.cardId) return cardById.get(r.cardId)?.name ?? '—';
		if (r.accountId) return accountById.get(r.accountId)?.name ?? '—';
		return '—';
	}

	let createOpen = $state(false);
	let createError = $state<string | null>(null);
	let editing = $state<RecurringView | null>(null);
	let editError = $state<string | null>(null);

	let newMethod = $state<'pix' | 'debit' | 'cash' | 'credit'>('pix');
	let newFrequency = $state<'weekly' | 'monthly' | 'yearly'>('monthly');
	// Estado dos selects (custom, não-nativo — ver ui/select) do form "nova
	// recorrência"; os de "editar" são seedados com a recorrência clicada em
	// `editing = r` (mesmo padrão de more/accounts/+page.svelte).
	let newType = $state<'expense' | 'income'>('expense');
	let newCategoryId = $state('');
	let newCardId = $state('');
	let newAccountId = $state('');
	let newDayOfReference = $state('0');
	let newMonthOfReference = $state('1');
	let editType = $state<'expense' | 'income'>('expense');
	let editCategoryId = $state('');
	let editMethod = $state<'pix' | 'debit' | 'cash' | 'credit'>('pix');
	let editFrequency = $state<'weekly' | 'monthly' | 'yearly'>('monthly');
	let editCardId = $state('');
	let editAccountId = $state('');
	let editDayOfReference = $state('0');
	let editMonthOfReference = $state('1');

	/** Seed do primeiro item disponível — mesmo comportamento do <select> nativo
	 *  anterior, que sempre começava selecionado na primeira <option> do DOM. */
	$effect(() => {
		if (!newCardId && activeCards[0]) newCardId = activeCards[0].id;
		if (!newAccountId && activeAccounts[0]) newAccountId = activeAccounts[0].id;
	});

	const TYPE_OPTIONS = [
		{ value: 'expense', label: 'Despesa' },
		{ value: 'income', label: 'Receita' }
	];
	const METHOD_OPTIONS = [
		{ value: 'pix', label: 'Pix' },
		{ value: 'debit', label: 'Débito' },
		{ value: 'cash', label: 'Dinheiro' },
		{ value: 'credit', label: 'Crédito' }
	];
	const FREQUENCY_OPTIONS = [
		{ value: 'weekly', label: 'Semanal' },
		{ value: 'monthly', label: 'Mensal' },
		{ value: 'yearly', label: 'Anual' }
	];
	const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, value) => ({ value: String(value), label }));
	const MONTH_OPTIONS = MONTH_NAMES.map((label, index) => ({ value: String(index + 1), label }));
	const categoryOptions = $derived(
		data.categories.map((category) => ({
			value: category.id,
			label: category.name,
			icon: resolveCategoryIcon(category.icon),
			color: category.color
		}))
	);
	const activeCardOptions = $derived(
		activeCards.map((card) => ({ value: card.id, label: card.name }))
	);
	const activeAccountOptions = $derived(
		activeAccounts.map((account) => ({ value: account.id, label: account.name }))
	);
</script>

<svelte:head>
	<title>Recorrências — Marcelus</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-semibold">Recorrências</h1>
		{#if canManage}
			<Button
				onclick={() => {
					createError = null;
					newType = 'expense';
					newCategoryId = data.categories[0]?.id ?? '';
					newMethod = 'pix';
					newFrequency = 'monthly';
					newCardId = '';
					newAccountId = '';
					newDayOfReference = '0';
					newMonthOfReference = '1';
					createOpen = true;
				}}>Nova recorrência</Button
			>
		{/if}
	</div>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="overflow-x-auto rounded-lg border border-foreground/10">
		<table class="w-full min-w-[640px] text-sm">
			<thead>
				<tr class="border-b border-foreground/10 text-left text-muted-foreground">
					<th class="px-3 py-2 font-medium">Descrição</th>
					<th class="px-3 py-2 font-medium">Frequência</th>
					<th class="px-3 py-2 font-medium">Origem</th>
					<th class="px-3 py-2 text-right font-medium">Valor</th>
					{#if canManage}
						<th class="px-3 py-2 text-right font-medium">Ações</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each data.recurring as r (r.id)}
					{@const category = categoryById.get(r.categoryId)}
					{@const isExpense = r.type === 'expense'}
					<tr class="border-b border-foreground/10 last:border-0 hover:bg-primary/5">
						<td class="px-3 py-2 font-medium">
							{r.description}
							<p class="text-xs font-normal text-muted-foreground">{category?.name ?? '—'}</p>
						</td>
						<td class="px-3 py-2 whitespace-nowrap text-muted-foreground">
							{describeFrequency(r)}
						</td>
						<td class="px-3 py-2 whitespace-nowrap text-muted-foreground">
							{describeTarget(r)}
						</td>
						<td class="px-3 py-2 text-right whitespace-nowrap">
							<p class="font-medium {isExpense ? 'text-destructive' : 'text-success'}">
								{isExpense ? '- ' : ''}{formatCents(r.amount)}
							</p>
						</td>
						{#if canManage}
							<td class="px-3 py-2 text-right whitespace-nowrap">
								<div class="flex items-center justify-end gap-2">
									<form method="POST" action="?/toggleActive" use:enhance>
										<input type="hidden" name="recurringId" value={r.id} />
										<input type="hidden" name="active" value={(!r.active).toString()} />
										<Button type="submit" variant={r.active ? 'outline' : 'ghost'} size="sm">
											{r.active ? 'Ativa' : 'Pausada'}
										</Button>
									</form>
									<Button
										variant="ghost"
										size="icon-sm"
										title="Editar"
										aria-label="Editar"
										onclick={() => {
											editError = null;
											editType = r.type;
											editCategoryId = r.categoryId;
											editMethod = r.cardId ? 'credit' : 'pix';
											editFrequency = r.frequency;
											editCardId = r.cardId ?? '';
											editAccountId = r.accountId ?? '';
											editDayOfReference = String(r.dayOfReference);
											editMonthOfReference = String(r.monthOfReference ?? 1);
											editing = r;
										}}
									>
										<PencilSimpleIcon size={16} />
									</Button>
									<form method="POST" action="?/remove" use:enhance>
										<input type="hidden" name="recurringId" value={r.id} />
										<Button
											type="submit"
											variant="ghost"
											size="icon-sm"
											title="Excluir"
											aria-label="Excluir"
										>
											<TrashIcon size={16} />
										</Button>
									</form>
								</div>
							</td>
						{/if}
					</tr>
				{:else}
					<tr>
						<td colspan={canManage ? 5 : 4} class="px-3 py-6 text-center text-muted-foreground">
							Nenhuma recorrência cadastrada ainda.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#snippet recurringFields(
	prefix: string,
	type: 'expense' | 'income',
	onTypeChange: (value: string) => void,
	categoryId: string,
	onCategoryIdChange: (value: string) => void,
	r?: RecurringView
)}
	<div class="grid gap-2">
		<Label for="{prefix}-description">Descrição</Label>
		<Input id="{prefix}-description" name="description" value={r?.description ?? ''} required />
	</div>
	<div class="grid grid-cols-2 gap-4">
		<div class="grid gap-2">
			<Label for="{prefix}-amount">Valor</Label>
			<Input
				id="{prefix}-amount"
				name="amount"
				inputmode="decimal"
				placeholder="0,00"
				value={r ? (r.amount / 100).toFixed(2).replace('.', ',') : ''}
				required
			/>
		</div>
		<div class="grid gap-2">
			<Label for="{prefix}-type">Tipo</Label>
			<Select
				id="{prefix}-type"
				name="type"
				options={TYPE_OPTIONS}
				value={type}
				onValueChange={onTypeChange}
			/>
		</div>
	</div>
	<div class="grid gap-2">
		<Label for="{prefix}-category">Categoria</Label>
		<ComboSelect
			id="{prefix}-category"
			name="categoryId"
			required
			options={categoryOptions}
			value={categoryId}
			onValueChange={onCategoryIdChange}
		/>
	</div>
{/snippet}

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Nova recorrência</Dialog.Title>
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
			{@render recurringFields(
				'new',
				newType,
				(v) => (newType = v as typeof newType),
				newCategoryId,
				(v) => (newCategoryId = v)
			)}
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="new-method">Método</Label>
					<Select
						id="new-method"
						name="method"
						options={METHOD_OPTIONS}
						value={newMethod}
						onValueChange={(v) => (newMethod = v as typeof newMethod)}
					/>
				</div>
				{#if newMethod === 'credit'}
					<div class="grid gap-2">
						<Label for="new-card">Cartão</Label>
						<Select
							id="new-card"
							name="cardId"
							required
							options={activeCardOptions}
							value={newCardId}
							onValueChange={(v) => (newCardId = v)}
						/>
					</div>
				{:else}
					<div class="grid gap-2">
						<Label for="new-account">Conta</Label>
						<Select
							id="new-account"
							name="accountId"
							required
							options={activeAccountOptions}
							value={newAccountId}
							onValueChange={(v) => (newAccountId = v)}
						/>
					</div>
				{/if}
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="new-frequency">Frequência</Label>
					<Select
						id="new-frequency"
						name="frequency"
						options={FREQUENCY_OPTIONS}
						value={newFrequency}
						onValueChange={(v) => (newFrequency = v as typeof newFrequency)}
					/>
				</div>
				<div class="grid gap-2">
					<Label for="new-day">{newFrequency === 'weekly' ? 'Dia da semana' : 'Dia do mês'}</Label>
					{#if newFrequency === 'weekly'}
						<Select
							id="new-day"
							name="dayOfReference"
							options={WEEKDAY_OPTIONS}
							value={newDayOfReference}
							onValueChange={(v) => (newDayOfReference = v)}
						/>
					{:else}
						<Input
							id="new-day"
							name="dayOfReference"
							type="number"
							min="1"
							max="31"
							value="1"
							required
						/>
					{/if}
				</div>
			</div>
			{#if newFrequency === 'yearly'}
				<div class="grid gap-2">
					<Label for="new-month">Mês</Label>
					<Select
						id="new-month"
						name="monthOfReference"
						options={MONTH_OPTIONS}
						value={newMonthOfReference}
						onValueChange={(v) => (newMonthOfReference = v)}
					/>
				</div>
			{/if}
			<Dialog.Footer>
				<Button type="submit">Adicionar</Button>
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
			<Dialog.Title>Editar recorrência</Dialog.Title>
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
				<input type="hidden" name="recurringId" value={editing.id} />
				{@render recurringFields(
					'edit',
					editType,
					(v) => (editType = v as typeof editType),
					editCategoryId,
					(v) => (editCategoryId = v),
					editing
				)}
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label for="edit-method">Método</Label>
						<Select
							id="edit-method"
							name="method"
							options={METHOD_OPTIONS}
							value={editMethod}
							onValueChange={(v) => (editMethod = v as typeof editMethod)}
						/>
					</div>
					{#if editing.cardId}
						<div class="grid gap-2">
							<Label for="edit-card">Cartão</Label>
							<Select
								id="edit-card"
								name="cardId"
								options={activeCardOptions}
								value={editCardId}
								onValueChange={(v) => (editCardId = v)}
							/>
						</div>
					{:else}
						<div class="grid gap-2">
							<Label for="edit-account">Conta</Label>
							<Select
								id="edit-account"
								name="accountId"
								options={activeAccountOptions}
								value={editAccountId}
								onValueChange={(v) => (editAccountId = v)}
							/>
						</div>
					{/if}
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label for="edit-frequency">Frequência</Label>
						<Select
							id="edit-frequency"
							name="frequency"
							options={FREQUENCY_OPTIONS}
							value={editFrequency}
							onValueChange={(v) => (editFrequency = v as typeof editFrequency)}
						/>
					</div>
					<div class="grid gap-2">
						<Label for="edit-day">
							{editFrequency === 'weekly' ? 'Dia da semana' : 'Dia do mês'}
						</Label>
						{#if editFrequency === 'weekly'}
							<Select
								id="edit-day"
								name="dayOfReference"
								options={WEEKDAY_OPTIONS}
								value={editDayOfReference}
								onValueChange={(v) => (editDayOfReference = v)}
							/>
						{:else}
							<Input
								id="edit-day"
								name="dayOfReference"
								type="number"
								min="1"
								max="31"
								value={editing.dayOfReference}
								required
							/>
						{/if}
					</div>
				</div>
				{#if editFrequency === 'yearly'}
					<div class="grid gap-2">
						<Label for="edit-month">Mês</Label>
						<Select
							id="edit-month"
							name="monthOfReference"
							options={MONTH_OPTIONS}
							value={editMonthOfReference}
							onValueChange={(v) => (editMonthOfReference = v)}
						/>
					</div>
				{/if}
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
