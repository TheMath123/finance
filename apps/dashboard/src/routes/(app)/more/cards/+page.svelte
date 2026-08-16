<script lang="ts">
	import { BANK_CATALOG, getBank } from '@finance/shared';

	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import { formatCents } from '$lib/money';
	import type { CardView } from '$lib/server/card-api';

	let { data, form } = $props();

	const canManage = $derived(
		data.activeWorkspace?.role === 'owner' || data.activeWorkspace?.role === 'admin'
	);

	let createOpen = $state(false);
	let createError = $state<string | null>(null);
	let editing = $state<CardView | null>(null);
	let editError = $state<string | null>(null);

	const BANK_OPTIONS = BANK_CATALOG.map((bank) => ({ value: bank.code, label: bank.name }));

	// Estado do select (custom, não-nativo — ver ui/select) do form "novo
	// cartão"; o de "editar" é seedado com o cartão clicado em `editing = ...`.
	let newBankCode = $state(BANK_CATALOG[0]?.code ?? '');
	let editBankCode = $state('');
</script>

<svelte:head>
	<title>Cartões — Marcelus</title>
</svelte:head>

{#snippet cardFields(
	prefix: string,
	bankCode: string,
	onBankCodeChange: (value: string) => void,
	card?: CardView
)}
	<div class="grid gap-2">
		<Label for="{prefix}-name">Nome</Label>
		<Input id="{prefix}-name" name="name" value={card?.name ?? ''} required />
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
		<Label for="{prefix}-limit">Limite</Label>
		<Input
			id="{prefix}-limit"
			name="limit"
			inputmode="decimal"
			value={card ? (card.limit / 100).toFixed(2).replace('.', ',') : ''}
			placeholder="1500,00"
			required
		/>
	</div>
	<div class="grid grid-cols-2 gap-4">
		<div class="grid gap-2">
			<Label for="{prefix}-closing">Fecha dia</Label>
			<Input
				id="{prefix}-closing"
				name="closingDay"
				type="number"
				min="1"
				max="28"
				value={card?.closingDay ?? ''}
				required
			/>
		</div>
		<div class="grid gap-2">
			<Label for="{prefix}-due">Vence dia</Label>
			<Input
				id="{prefix}-due"
				name="dueDay"
				type="number"
				min="1"
				max="28"
				value={card?.dueDay ?? ''}
				required
			/>
		</div>
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
				}}>Adicionar cartão</Button
			>
		</div>
	{/if}

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		{#each data.cards as card (card.id)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				<div class="flex min-w-0 items-center gap-3">
					<span
						class="h-3 w-3 shrink-0 rounded-full"
						style="background-color: {getBank(card.bankCode)?.color ?? '#6B7280'}"
					></span>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">
							{card.name}
							{#if card.archivedAt}
								<span class="text-muted-foreground">(arquivado)</span>
							{/if}
						</p>
						<p class="text-sm text-muted-foreground">
							{getBank(card.bankCode)?.name ?? card.bankCode} • fecha dia {card.closingDay} • vence dia
							{card.dueDay}
						</p>
					</div>
				</div>
				<div class="flex shrink-0 items-center gap-3">
					<div class="text-right">
						<p class="text-sm font-medium">{formatCents(card.availableLimit)}</p>
						<p class="text-xs text-muted-foreground">de {formatCents(card.limit)}</p>
					</div>
					<Button href={resolve(`/more/cards/${card.id}/invoices`)} variant="outline" size="sm">
						Faturas
					</Button>
					{#if canManage}
						<Button
							variant="outline"
							size="sm"
							onclick={() => {
								editError = null;
								editBankCode = card.bankCode;
								editing = card;
							}}>Editar</Button
						>
						{#if !card.archivedAt}
							<form method="POST" action="?/archive" use:enhance>
								<input type="hidden" name="cardId" value={card.id} />
								<Button type="submit" variant="outline" size="sm">Arquivar</Button>
							</form>
						{/if}
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="cardId" value={card.id} />
							<Button type="submit" variant="destructive" size="sm">Excluir</Button>
						</form>
					{/if}
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
		{/each}
	</div>
</div>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Adicionar cartão</Dialog.Title>
			<Dialog.Description>O limite disponível é derivado das faturas em aberto.</Dialog.Description>
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
			{@render cardFields('new', newBankCode, (v) => (newBankCode = v))}
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
			<Dialog.Title>Editar cartão</Dialog.Title>
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
				<input type="hidden" name="cardId" value={editing.id} />
				{@render cardFields('edit', editBankCode, (v) => (editBankCode = v), editing)}
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
