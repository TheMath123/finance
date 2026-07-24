<script lang="ts">
	import { BANK_CATALOG, getBank } from '@finance/shared';

	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { formatCents } from '$lib/money';

	let { data, form } = $props();

	const canManage = $derived(
		data.activeWorkspace?.role === 'owner' || data.activeWorkspace?.role === 'admin'
	);
	const editingId = $derived(page.url.searchParams.get('edit'));

	const TYPE_LABELS: Record<string, string> = {
		checking: 'Conta corrente',
		savings: 'Poupança',
		payment: 'Conta de pagamento'
	};
</script>

<svelte:head>
	<title>Contas — Finance</title>
</svelte:head>

{#snippet accountFields(prefix: string, account?: (typeof data.accounts)[number])}
	<div class="grid min-w-40 flex-1 gap-2">
		<Label for="{prefix}-name">Nome</Label>
		<Input id="{prefix}-name" name="name" value={account?.name ?? form?.name ?? ''} required />
	</div>
	<div class="grid gap-2">
		<Label for="{prefix}-bank">Banco</Label>
		<select
			id="{prefix}-bank"
			name="bankCode"
			value={account?.bankCode}
			class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{#each BANK_CATALOG as bank (bank.code)}
				<option value={bank.code}>{bank.name}</option>
			{/each}
		</select>
	</div>
	<div class="grid gap-2">
		<Label for="{prefix}-type">Tipo</Label>
		<select
			id="{prefix}-type"
			name="type"
			value={account?.type}
			class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<option value="checking">Conta corrente</option>
			<option value="savings">Poupança</option>
			<option value="payment">Conta de pagamento</option>
		</select>
	</div>
	<div class="grid w-32 gap-2">
		<Label for="{prefix}-balance">Saldo inicial</Label>
		<Input
			id="{prefix}-balance"
			name="initialBalance"
			inputmode="decimal"
			value={account ? (account.initialBalance / 100).toFixed(2).replace('.', ',') : '0,00'}
			required
		/>
	</div>
{/snippet}

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<h1 class="text-xl font-semibold">Contas</h1>

	{#if canManage}
		<form method="POST" action="?/create" class="flex flex-wrap items-end gap-3" use:enhance>
			{@render accountFields('new')}
			<Button type="submit">Adicionar</Button>
		</form>
	{/if}

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		{#each data.accounts as account (account.id)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				{#if editingId === account.id && canManage}
					<form
						method="POST"
						action="?/update"
						class="flex flex-1 flex-wrap items-end gap-3"
						use:enhance
					>
						<input type="hidden" name="accountId" value={account.id} />
						{@render accountFields(account.id, account)}
						<Button type="submit" size="sm">Salvar</Button>
						<a
							href={resolve('/accounts')}
							class="text-sm text-muted-foreground underline-offset-4 hover:underline"
						>
							Cancelar
						</a>
					</form>
				{:else}
					<div class="flex min-w-0 items-center gap-3">
						<span
							class="h-3 w-3 shrink-0 rounded-full"
							style="background-color: {getBank(account.bankCode)?.color ?? '#6B7280'}"
						></span>
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">
								{account.name}
								{#if account.archivedAt}
									<span class="text-muted-foreground">(arquivada)</span>
								{/if}
							</p>
							<p class="text-sm text-muted-foreground">
								{getBank(account.bankCode)?.name ?? account.bankCode} •
								{TYPE_LABELS[account.type] ?? account.type}
							</p>
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-3">
						<span class="text-sm font-medium">{formatCents(account.balance)}</span>
						{#if canManage}
							<a
								href="{resolve('/accounts')}?edit={account.id}"
								class="text-sm text-primary underline-offset-4 hover:underline"
							>
								Editar
							</a>
							{#if !account.archivedAt}
								<form method="POST" action="?/archive" use:enhance>
									<input type="hidden" name="accountId" value={account.id} />
									<Button type="submit" variant="outline" size="sm">Arquivar</Button>
								</form>
							{/if}
							<form method="POST" action="?/remove" use:enhance>
								<input type="hidden" name="accountId" value={account.id} />
								<Button type="submit" variant="destructive" size="sm">Excluir</Button>
							</form>
						{/if}
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
		{/each}
	</div>
</div>
