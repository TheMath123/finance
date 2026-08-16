<script lang="ts">
	import { BANK_CATALOG, getBank } from '@finance/shared';

	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import type { BankView } from '$lib/server/bank-api';

	let { data, form } = $props();

	const canManage = $derived(
		data.activeWorkspace?.role === 'owner' || data.activeWorkspace?.role === 'admin'
	);

	let createOpen = $state(false);
	let createError = $state<string | null>(null);
	let editing = $state<BankView | null>(null);
	let editError = $state<string | null>(null);

	const BANK_OPTIONS = BANK_CATALOG.map((bank) => ({ value: bank.code, label: bank.name }));

	// Estado dos selects (custom, não-nativo — ver ui/select) do form "novo
	// banco"; o de "editar" é seedado com o banco clicado em `editing = ...`.
	let newBankCode = $state(BANK_CATALOG[0]?.code ?? '');
	let editBankCode = $state('');
</script>

<svelte:head>
	<title>Bancos — Marcelus</title>
</svelte:head>

{#snippet bankFields(
	prefix: string,
	bankCode: string,
	onBankCodeChange: (value: string) => void,
	bank?: BankView
)}
	<div class="grid gap-2">
		<Label for="{prefix}-name">Nome</Label>
		<Input
			id="{prefix}-name"
			name="name"
			value={bank?.name ?? ''}
			placeholder="Nubank pessoal"
			required
		/>
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
{/snippet}

<div class="flex flex-col gap-6">
	{#if canManage}
		<div class="flex justify-end">
			<Button
				onclick={() => {
					createError = null;
					newBankCode = BANK_CATALOG[0]?.code ?? '';
					createOpen = true;
				}}>Adicionar banco</Button
			>
		</div>
	{/if}

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		{#each data.banks as bank (bank.id)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				<div class="flex min-w-0 items-center gap-3">
					<span
						class="h-3 w-3 shrink-0 rounded-full"
						style="background-color: {getBank(bank.bankCode)?.color ?? '#6B7280'}"
					></span>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">
							{bank.name}
							{#if bank.archivedAt}
								<span class="text-muted-foreground">(arquivado)</span>
							{/if}
						</p>
						<p class="text-sm text-muted-foreground">
							{getBank(bank.bankCode)?.name ?? bank.bankCode}
						</p>
					</div>
				</div>
				{#if canManage}
					<div class="flex shrink-0 items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onclick={() => {
								editError = null;
								editBankCode = bank.bankCode;
								editing = bank;
							}}>Editar</Button
						>
						{#if !bank.archivedAt}
							<form method="POST" action="?/archive" use:enhance>
								<input type="hidden" name="bankId" value={bank.id} />
								<Button type="submit" variant="outline" size="sm">Arquivar</Button>
							</form>
						{/if}
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="bankId" value={bank.id} />
							<Button type="submit" variant="destructive" size="sm">Excluir</Button>
						</form>
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum banco cadastrado ainda.</p>
		{/each}
	</div>
</div>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Adicionar banco</Dialog.Title>
			<Dialog.Description>O banco agrupa suas contas e cartões.</Dialog.Description>
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
			{@render bankFields('new', newBankCode, (v) => (newBankCode = v))}
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
			<Dialog.Title>Editar banco</Dialog.Title>
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
				<input type="hidden" name="bankId" value={editing.id} />
				{@render bankFields('edit', editBankCode, (v) => (editBankCode = v), editing)}
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
