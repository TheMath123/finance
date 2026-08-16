<script lang="ts">
	import { BANK_CATALOG, getBank } from '@finance/shared';

	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import { formatCents } from '$lib/money';
	import type { AccountView } from '$lib/server/account-api';

	let { data, form } = $props();

	const canManage = $derived(
		data.activeWorkspace?.role === 'owner' || data.activeWorkspace?.role === 'admin'
	);

	let createOpen = $state(false);
	let createError = $state<string | null>(null);
	let editing = $state<AccountView | null>(null);
	let editError = $state<string | null>(null);

	const TYPE_LABELS: Record<string, string> = {
		checking: 'Conta corrente',
		savings: 'Poupança',
		payment: 'Conta de pagamento'
	};

	const BANK_OPTIONS = BANK_CATALOG.map((bank) => ({ value: bank.code, label: bank.name }));
	const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

	// Estado dos selects (custom, não-nativo — ver ui/select) do form "nova
	// conta"; o de "editar" é seedado com a conta clicada em `editing = ...`.
	let newBankCode = $state(BANK_CATALOG[0]?.code ?? '');
	let newType = $state('checking');
	let editBankCode = $state('');
	let editType = $state('');
</script>

<svelte:head>
	<title>Contas — Marcelus</title>
</svelte:head>

{#snippet accountFields(
	prefix: string,
	bankCode: string,
	onBankCodeChange: (value: string) => void,
	type: string,
	onTypeChange: (value: string) => void,
	account?: AccountView
)}
	<div class="grid gap-2">
		<Label for="{prefix}-name">Nome</Label>
		<Input id="{prefix}-name" name="name" value={account?.name ?? ''} required />
	</div>
	<div class="grid gap-2">
		<Label for="{prefix}-bank">Banco</Label>
		<Select
			id="{prefix}-bank"
			name="bankCode"
			options={BANK_OPTIONS}
			value={bankCode}
			onValueChange={onBankCodeChange}
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
	<div class="grid gap-2">
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

<div class="flex flex-col gap-6">
	{#if canManage}
		<div class="flex justify-end">
			<Button
				onclick={() => {
					createError = null;
					newBankCode = BANK_CATALOG[0]?.code ?? '';
					newType = 'checking';
					createOpen = true;
				}}>Adicionar conta</Button
			>
		</div>
	{/if}

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		{#each data.accounts as account (account.id)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
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
						<Button
							variant="outline"
							size="sm"
							onclick={() => {
								editError = null;
								editBankCode = account.bankCode;
								editType = account.type;
								editing = account;
							}}>Editar</Button
						>
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
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
		{/each}
	</div>
</div>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Adicionar conta</Dialog.Title>
			<Dialog.Description>O saldo atual é sempre derivado das transações.</Dialog.Description>
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
			{@render accountFields(
				'new',
				newBankCode,
				(v) => (newBankCode = v),
				newType,
				(v) => (newType = v)
			)}
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
			<Dialog.Title>Editar conta</Dialog.Title>
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
				<input type="hidden" name="accountId" value={editing.id} />
				{@render accountFields(
					'edit',
					editBankCode,
					(v) => (editBankCode = v),
					editType,
					(v) => (editType = v),
					editing
				)}
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
