<script lang="ts">
	import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';

	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
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
	let editing = $state<RecurringView | null>(null);

	let newMethod = $state<'pix' | 'debit' | 'cash' | 'credit'>('pix');
	let newFrequency = $state<'weekly' | 'monthly' | 'yearly'>('monthly');

	function closeOnSuccess(close: () => void) {
		return async ({
			result,
			update
		}: {
			result: { type: string };
			update: () => Promise<void>;
		}) => {
			if (result.type === 'success') close();
			await update();
		};
	}
</script>

<svelte:head>
	<title>Recorrências — Marcelus</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-semibold">Recorrências</h1>
		{#if canManage}
			<Button onclick={() => (createOpen = true)}>Nova recorrência</Button>
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
										onclick={() => (editing = r)}
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

{#snippet recurringFields(prefix: string, r?: RecurringView)}
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
			<select
				id="{prefix}-type"
				name="type"
				value={r?.type ?? 'expense'}
				class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<option value="expense">Despesa</option>
				<option value="income">Receita</option>
			</select>
		</div>
	</div>
	<div class="grid gap-2">
		<Label for="{prefix}-category">Categoria</Label>
		<select
			id="{prefix}-category"
			name="categoryId"
			value={r?.categoryId}
			required
			class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{#each data.categories as category (category.id)}
				<option value={category.id}>{category.name}</option>
			{/each}
		</select>
	</div>
{/snippet}

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Nova recorrência</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/create"
			class="grid gap-4"
			use:enhance={() => closeOnSuccess(() => (createOpen = false))}
		>
			{@render recurringFields('new')}
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="new-method">Método</Label>
					<select
						id="new-method"
						name="method"
						bind:value={newMethod}
						class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="pix">Pix</option>
						<option value="debit">Débito</option>
						<option value="cash">Dinheiro</option>
						<option value="credit">Crédito</option>
					</select>
				</div>
				{#if newMethod === 'credit'}
					<div class="grid gap-2">
						<Label for="new-card">Cartão</Label>
						<select
							id="new-card"
							name="cardId"
							required
							class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{#each activeCards as card (card.id)}
								<option value={card.id}>{card.name}</option>
							{/each}
						</select>
					</div>
				{:else}
					<div class="grid gap-2">
						<Label for="new-account">Conta</Label>
						<select
							id="new-account"
							name="accountId"
							required
							class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{#each activeAccounts as account (account.id)}
								<option value={account.id}>{account.name}</option>
							{/each}
						</select>
					</div>
				{/if}
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="new-frequency">Frequência</Label>
					<select
						id="new-frequency"
						name="frequency"
						bind:value={newFrequency}
						class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="weekly">Semanal</option>
						<option value="monthly">Mensal</option>
						<option value="yearly">Anual</option>
					</select>
				</div>
				<div class="grid gap-2">
					<Label for="new-day">{newFrequency === 'weekly' ? 'Dia da semana' : 'Dia do mês'}</Label>
					{#if newFrequency === 'weekly'}
						<select
							id="new-day"
							name="dayOfReference"
							class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{#each WEEKDAY_LABELS as label, value (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
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
					<select
						id="new-month"
						name="monthOfReference"
						class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{#each MONTH_NAMES as label, index (index)}
							<option value={index + 1}>{label}</option>
						{/each}
					</select>
				</div>
			{/if}
			<Dialog.Footer>
				<Button type="submit">Adicionar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={editing !== null} onOpenChange={(open) => !open && (editing = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Editar recorrência</Dialog.Title>
		</Dialog.Header>
		{#if editing}
			{@const editFrequency = editing.frequency}
			{@const editMethod = editing.cardId ? 'credit' : 'pix'}
			<form
				method="POST"
				action="?/update"
				class="grid gap-4"
				use:enhance={() => closeOnSuccess(() => (editing = null))}
			>
				<input type="hidden" name="recurringId" value={editing.id} />
				{@render recurringFields('edit', editing)}
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label for="edit-method">Método</Label>
						<select
							id="edit-method"
							name="method"
							value={editMethod}
							class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<option value="pix">Pix</option>
							<option value="debit">Débito</option>
							<option value="cash">Dinheiro</option>
							<option value="credit">Crédito</option>
						</select>
					</div>
					{#if editing.cardId}
						<div class="grid gap-2">
							<Label for="edit-card">Cartão</Label>
							<select
								id="edit-card"
								name="cardId"
								value={editing.cardId}
								class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{#each activeCards as card (card.id)}
									<option value={card.id}>{card.name}</option>
								{/each}
							</select>
						</div>
					{:else}
						<div class="grid gap-2">
							<Label for="edit-account">Conta</Label>
							<select
								id="edit-account"
								name="accountId"
								value={editing.accountId}
								class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{#each activeAccounts as account (account.id)}
									<option value={account.id}>{account.name}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label for="edit-frequency">Frequência</Label>
						<select
							id="edit-frequency"
							name="frequency"
							value={editFrequency}
							class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<option value="weekly">Semanal</option>
							<option value="monthly">Mensal</option>
							<option value="yearly">Anual</option>
						</select>
					</div>
					<div class="grid gap-2">
						<Label for="edit-day">
							{editFrequency === 'weekly' ? 'Dia da semana' : 'Dia do mês'}
						</Label>
						{#if editFrequency === 'weekly'}
							<select
								id="edit-day"
								name="dayOfReference"
								value={editing.dayOfReference}
								class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{#each WEEKDAY_LABELS as label, value (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
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
						<select
							id="edit-month"
							name="monthOfReference"
							value={editing.monthOfReference ?? 1}
							class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{#each MONTH_NAMES as label, index (index)}
								<option value={index + 1}>{label}</option>
							{/each}
						</select>
					</div>
				{/if}
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
