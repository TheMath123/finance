<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { formatCents } from '$lib/money';
	import type { TransactionView } from '$lib/server/transaction-api';
	import { formatTransactionDate, transactionSourceLabel } from '$lib/transaction-labels';

	let { data, form } = $props();

	const canManage = $derived(data.activeWorkspace?.role !== 'viewer');

	const categoryById = $derived(new Map(data.categories.map((c) => [c.id, c])));
	const accountById = $derived(new Map(data.accounts.map((a) => [a.id, a])));
	const cardById = $derived(new Map(data.cards.map((c) => [c.id, c])));

	const activeAccounts = $derived(data.accounts.filter((a) => !a.archivedAt));
	const activeCards = $derived(data.cards.filter((c) => !c.archivedAt));

	let createOpen = $state(false);
	let editing = $state<TransactionView | null>(null);

	let newMethod = $state<'pix' | 'debit' | 'cash' | 'credit' | 'transfer'>('pix');

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

	function todayIso(): string {
		return new Date().toISOString().slice(0, 10);
	}
</script>

<svelte:head>
	<title>Transações — Finance</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-semibold">Transações</h1>
		<div class="flex items-center gap-2">
			<a
				href={resolve('/transactions/export')}
				class="rounded-lg border border-foreground/10 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
			>
				Exportar CSV
			</a>
			{#if canManage}
				<Button onclick={() => (createOpen = true)}>Nova transação</Button>
			{/if}
		</div>
	</div>

	<!-- Filtros: GET puro, sem JS necessário — cada campo re-submete a página. -->
	<form method="GET" class="flex flex-wrap items-end gap-3">
		<div class="grid min-w-48 flex-1 gap-2">
			<Label for="q">Buscar</Label>
			<Input id="q" name="q" value={data.filters.q ?? ''} placeholder="Descrição" />
		</div>
		<div class="grid gap-2">
			<Label for="from">De</Label>
			<Input id="from" name="from" type="date" value={data.filters.from ?? ''} />
		</div>
		<div class="grid gap-2">
			<Label for="to">Até</Label>
			<Input id="to" name="to" type="date" value={data.filters.to ?? ''} />
		</div>
		<div class="grid gap-2">
			<Label for="categoryId">Categoria</Label>
			<select
				id="categoryId"
				name="categoryId"
				value={data.filters.categoryId ?? ''}
				class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<option value="">Todas</option>
				{#each data.categories as category (category.id)}
					<option value={category.id}>{category.name}</option>
				{/each}
			</select>
		</div>
		<div class="grid gap-2">
			<Label for="accountId">Conta</Label>
			<select
				id="accountId"
				name="accountId"
				value={data.filters.accountId ?? ''}
				class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<option value="">Todas</option>
				{#each data.accounts as account (account.id)}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>
		</div>
		<div class="grid gap-2">
			<Label for="cardId">Cartão</Label>
			<select
				id="cardId"
				name="cardId"
				value={data.filters.cardId ?? ''}
				class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<option value="">Todos</option>
				{#each data.cards as card (card.id)}
					<option value={card.id}>{card.name}</option>
				{/each}
			</select>
		</div>
		<label class="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
			<input
				type="checkbox"
				name="deletedOnly"
				value="true"
				checked={data.filters.deletedOnly}
				class="accent-primary"
			/>
			Ver excluídas
		</label>
		<Button type="submit" variant="outline">Filtrar</Button>
	</form>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		{#each data.transactions as transaction (transaction.id)}
			{@const category = categoryById.get(transaction.categoryId)}
			{@const isExpense = transaction.type === 'expense'}
			{@const isInstallment = transaction.installmentTotal !== null}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				<div class="flex min-w-0 items-center gap-3">
					<span
						class="h-3 w-3 shrink-0 rounded-full"
						style="background-color: {category?.color ?? '#6B7280'}"
					></span>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">{transaction.description}</p>
						<p class="truncate text-sm text-muted-foreground">
							{transactionSourceLabel(transaction, cardById, accountById)} •
							{formatTransactionDate(transaction.date)}
							{#if category}
								• {category.name}
							{/if}
						</p>
					</div>
				</div>
				<div class="flex shrink-0 items-center gap-3">
					<div class="text-right">
						{#if isInstallment}
							<p class="text-xs text-muted-foreground">
								{transaction.installmentNumber}/{transaction.installmentTotal}
							</p>
						{:else if transaction.hasActiveSplit}
							<p class="text-xs text-muted-foreground">Dividido</p>
						{/if}
						<p class="text-sm font-medium {isExpense ? 'text-destructive' : 'text-success'}">
							{isExpense ? '- ' : ''}{formatCents(transaction.amount)}
						</p>
					</div>
					{#if canManage}
						{#if transaction.deletedAt}
							<form method="POST" action="?/restore" use:enhance>
								<input type="hidden" name="transactionId" value={transaction.id} />
								<Button type="submit" variant="outline" size="sm">Restaurar</Button>
							</form>
						{:else}
							<Button variant="outline" size="sm" onclick={() => (editing = transaction)}>
								Editar
							</Button>
							<form method="POST" action="?/remove" use:enhance>
								<input type="hidden" name="transactionId" value={transaction.id} />
								<Button type="submit" variant="destructive" size="sm">Excluir</Button>
							</form>
						{/if}
					{/if}
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
		{/each}
	</div>
</div>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Nova transação</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/create"
			class="grid gap-4"
			use:enhance={() => closeOnSuccess(() => (createOpen = false))}
		>
			<div class="grid gap-2">
				<Label for="new-description">Descrição</Label>
				<Input id="new-description" name="description" required />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="new-amount">Valor</Label>
					<Input id="new-amount" name="amount" inputmode="decimal" placeholder="0,00" required />
				</div>
				<div class="grid gap-2">
					<Label for="new-date">Data</Label>
					<Input id="new-date" name="date" type="date" value={todayIso()} required />
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="new-type">Tipo</Label>
					<select
						id="new-type"
						name="type"
						disabled={newMethod === 'transfer'}
						class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
					>
						<option value="expense">Despesa</option>
						<option value="income">Receita</option>
					</select>
				</div>
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
						<option value="transfer">Transferência</option>
					</select>
				</div>
			</div>
			<div class="grid gap-2">
				<Label for="new-category">Categoria</Label>
				<select
					id="new-category"
					name="categoryId"
					required
					class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{#each data.categories as category (category.id)}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
			</div>

			{#if newMethod === 'credit'}
				<div class="grid grid-cols-2 gap-4">
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
					<div class="grid gap-2">
						<Label for="new-installments">Parcelas</Label>
						<Input
							id="new-installments"
							name="installments"
							type="number"
							min="1"
							max="48"
							value="1"
						/>
					</div>
				</div>
			{:else if newMethod === 'transfer'}
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label for="new-account-from">Conta de origem</Label>
						<select
							id="new-account-from"
							name="accountId"
							required
							class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{#each activeAccounts as account (account.id)}
								<option value={account.id}>{account.name}</option>
							{/each}
						</select>
					</div>
					<div class="grid gap-2">
						<Label for="new-account-to">Conta de destino</Label>
						<select
							id="new-account-to"
							name="toAccountId"
							required
							class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{#each activeAccounts as account (account.id)}
								<option value={account.id}>{account.name}</option>
							{/each}
						</select>
					</div>
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

			<Dialog.Footer>
				<Button type="submit">Adicionar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={editing !== null} onOpenChange={(open) => !open && (editing = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Editar transação</Dialog.Title>
			{#if editing?.installmentGroupId}
				<Dialog.Description>
					Parcela: valor, data e cartão ficam travados — edite só descrição/categoria.
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		{#if editing}
			{@const locked = editing.installmentGroupId !== null}
			<form
				method="POST"
				action="?/update"
				class="grid gap-4"
				use:enhance={() => closeOnSuccess(() => (editing = null))}
			>
				<input type="hidden" name="transactionId" value={editing.id} />
				<div class="grid gap-2">
					<Label for="edit-description">Descrição</Label>
					<Input id="edit-description" name="description" value={editing.description} required />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label for="edit-amount">Valor</Label>
						<Input
							id="edit-amount"
							name="amount"
							inputmode="decimal"
							disabled={locked}
							value={(editing.amount / 100).toFixed(2).replace('.', ',')}
							required
						/>
					</div>
					<div class="grid gap-2">
						<Label for="edit-date">Data</Label>
						<Input
							id="edit-date"
							name="date"
							type="date"
							disabled={locked}
							value={editing.date}
							required
						/>
					</div>
				</div>
				<div class="grid gap-2">
					<Label for="edit-category">Categoria</Label>
					<select
						id="edit-category"
						name="categoryId"
						value={editing.categoryId}
						required
						class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{#each data.categories as category (category.id)}
							<option value={category.id}>{category.name}</option>
						{/each}
					</select>
				</div>
				{#if editing.method !== 'transfer'}
					{#if editing.method === 'credit'}
						<div class="grid gap-2">
							<Label for="edit-card">Cartão</Label>
							<select
								id="edit-card"
								name="cardId"
								value={editing.cardId}
								disabled={locked}
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
				{/if}
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
