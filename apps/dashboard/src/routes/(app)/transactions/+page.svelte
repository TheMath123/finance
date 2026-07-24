<script lang="ts">
	import ArchiveIcon from 'phosphor-svelte/lib/ArchiveIcon';
	import ArrowCounterClockwiseIcon from 'phosphor-svelte/lib/ArrowCounterClockwiseIcon';
	import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon';

	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';

	import { resolveCategoryIcon } from '$lib/category-icon';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { getMerchantLogoUrl } from '$lib/merchant-logo';
	import { formatCents } from '$lib/money';
	import type { TransactionView } from '$lib/server/transaction-api';
	import { formatTransactionDate, transactionSourceLabel } from '$lib/transaction-labels';

	let { data, form } = $props();

	const canManage = $derived(data.activeWorkspace?.role !== 'viewer');
	const archivedView = $derived(data.filters.deletedOnly);

	/** IDs cuja logo de marca falhou ao carregar — cai pro ícone da categoria (fallback garantido). */
	const failedLogos = new SvelteSet<string>();

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

	/** Preserva os demais filtros da URL atual, só troca "Ativas"/"Arquivadas" (query string apenas — o `resolve()` da rota fica literal no template). */
	function archivedToggleQuery(archived: boolean): string {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (archived) {
			params.set('deletedOnly', 'true');
		} else {
			params.delete('deletedOnly');
		}
		return params.toString();
	}

	/** "De"/"Até" ficam pré-preenchidos com o mês atual (default do load) — este link limpa só o período, preservando os demais filtros. */
	function clearPeriodQuery(): string {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('from', '');
		params.set('to', '');
		return params.toString();
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

	<!-- Ativas/Arquivadas são duas listagens separadas (nunca misturadas) — mesmo padrão de abas usado no resto do dashboard. -->
	<nav class="flex gap-2">
		<a
			href="{resolve('/transactions')}?{archivedToggleQuery(false)}"
			class="rounded-lg px-3 py-1.5 text-sm transition-colors {!archivedView
				? 'bg-primary font-medium text-primary-foreground'
				: 'bg-primary/10 text-primary hover:bg-primary/20'}"
		>
			Ativas
		</a>
		<a
			href="{resolve('/transactions')}?{archivedToggleQuery(true)}"
			class="rounded-lg px-3 py-1.5 text-sm transition-colors {archivedView
				? 'bg-primary font-medium text-primary-foreground'
				: 'bg-primary/10 text-primary hover:bg-primary/20'}"
		>
			Arquivadas
		</a>
	</nav>

	<!--
		Filtros: GET puro, sem JS necessário — cada campo re-submete a página.
		Uma única instância de cada campo (nunca duplicar: dois <select
		name="categoryId"> no DOM ao mesmo tempo submeteriam os dois valores,
		mesmo com um escondido via CSS) — só o layout muda por breakpoint: grid
		2 colunas compacto no mobile, linha única flex no sm+.
	-->
	<form method="GET" class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
		{#if archivedView}
			<input type="hidden" name="deletedOnly" value="true" />
		{/if}
		<div class="grid gap-2 sm:min-w-48 sm:flex-1">
			<Label for="q">Buscar</Label>
			<Input id="q" name="q" value={data.filters.q ?? ''} placeholder="Descrição" />
		</div>
		<div class="grid grid-cols-2 gap-3 sm:contents">
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
		</div>
		<div class="flex gap-2">
			<Button type="submit" variant="outline" class="flex-1 sm:flex-none">Filtrar</Button>
			<a
				href="{resolve('/transactions')}?{clearPeriodQuery()}"
				class="flex items-center rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
			>
				Ver tudo
			</a>
		</div>
	</form>

	<p class="text-xs text-muted-foreground">
		Mostrando {data.filters.from ? formatTransactionDate(data.filters.from) : 'o início'} até
		{data.filters.to ? formatTransactionDate(data.filters.to) : 'hoje'}
		{#if !data.filters.from && !data.filters.to}(sem filtro de período){/if}
	</p>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	{#if archivedView}
		<p class="text-sm text-muted-foreground">
			Mostrando transações arquivadas — elas não entram em nenhum resumo/projeção até serem
			restauradas.
		</p>
	{/if}

	<!-- overflow-x-auto: tabela nunca deve estourar a largura em telas pequenas (spec: dashboard também atende mobile). -->
	<div class="overflow-x-auto rounded-lg border border-foreground/10">
		<table class="w-full min-w-[720px] text-sm">
			<thead>
				<tr class="border-b border-foreground/10 text-left text-muted-foreground">
					<th class="px-3 py-2 font-medium">Data</th>
					<th class="px-3 py-2 font-medium">Categoria</th>
					<th class="px-3 py-2 font-medium">Descrição</th>
					<th class="px-3 py-2 font-medium">Origem</th>
					<th class="px-3 py-2 text-right font-medium">Valor</th>
					{#if canManage}
						<th class="px-3 py-2 text-right font-medium">Ações</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each data.transactions as transaction (transaction.id)}
					{@const category = categoryById.get(transaction.categoryId)}
					{@const CategoryIcon = resolveCategoryIcon(category?.icon)}
					{@const logoUrl = getMerchantLogoUrl(transaction.description)}
					{@const showLogo = logoUrl && !failedLogos.has(transaction.id)}
					{@const isExpense = transaction.type === 'expense'}
					{@const isInstallment = transaction.installmentTotal !== null}
					<tr class="border-b border-foreground/10 last:border-0 hover:bg-primary/5">
						<td class="px-3 py-2 whitespace-nowrap text-muted-foreground">
							{formatTransactionDate(transaction.date)}
						</td>
						<td class="px-3 py-2">
							<span class="inline-flex items-center gap-2 whitespace-nowrap">
								{#if showLogo}
									<img
										src={logoUrl}
										alt=""
										class="h-4 w-4 shrink-0 object-contain"
										onerror={() => failedLogos.add(transaction.id)}
									/>
								{:else}
									<CategoryIcon size={16} color={category?.color ?? '#6B7280'} />
								{/if}
								{category?.name ?? '—'}
							</span>
						</td>
						<td class="max-w-64 truncate px-3 py-2 font-medium">
							{transaction.description}
							{#if archivedView}
								<span
									class="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground"
								>
									Arquivada
								</span>
							{/if}
						</td>
						<td class="px-3 py-2 whitespace-nowrap text-muted-foreground">
							{transactionSourceLabel(transaction, cardById, accountById)}
						</td>
						<td class="px-3 py-2 text-right whitespace-nowrap">
							{#if isInstallment}
								<p class="text-xs text-muted-foreground">
									{transaction.installmentNumber}/{transaction.installmentTotal}
								</p>
							{:else if transaction.hasActiveSplit}
								<p class="text-xs text-muted-foreground">Dividido</p>
							{/if}
							<p class="font-medium {isExpense ? 'text-destructive' : 'text-success'}">
								{isExpense ? '- ' : ''}{formatCents(transaction.amount)}
							</p>
						</td>
						{#if canManage}
							<td class="px-3 py-2 text-right whitespace-nowrap">
								<div class="flex justify-end gap-1">
									{#if archivedView}
										<form method="POST" action="?/restore" use:enhance>
											<input type="hidden" name="transactionId" value={transaction.id} />
											<Button
												type="submit"
												variant="ghost"
												size="icon-sm"
												title="Restaurar"
												aria-label="Restaurar"
											>
												<ArrowCounterClockwiseIcon size={16} />
											</Button>
										</form>
									{:else}
										<Button
											variant="ghost"
											size="icon-sm"
											title="Editar"
											aria-label="Editar"
											onclick={() => (editing = transaction)}
										>
											<PencilSimpleIcon size={16} />
										</Button>
										<form method="POST" action="?/remove" use:enhance>
											<input type="hidden" name="transactionId" value={transaction.id} />
											<Button
												type="submit"
												variant="ghost"
												size="icon-sm"
												title="Arquivar"
												aria-label="Arquivar"
											>
												<ArchiveIcon size={16} />
											</Button>
										</form>
									{/if}
								</div>
							</td>
						{/if}
					</tr>
				{:else}
					<tr>
						<td colspan={canManage ? 6 : 5} class="px-3 py-6 text-center text-muted-foreground">
							{archivedView ? 'Nenhuma transação arquivada.' : 'Nenhuma transação encontrada.'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
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
