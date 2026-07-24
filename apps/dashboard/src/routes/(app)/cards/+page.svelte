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
</script>

<svelte:head>
	<title>Cartões — Finance</title>
</svelte:head>

{#snippet cardFields(prefix: string, card?: (typeof data.cards)[number])}
	<div class="grid min-w-40 flex-1 gap-2">
		<Label for="{prefix}-name">Nome</Label>
		<Input id="{prefix}-name" name="name" value={card?.name ?? form?.name ?? ''} required />
	</div>
	<div class="grid gap-2">
		<Label for="{prefix}-bank">Banco</Label>
		<select
			id="{prefix}-bank"
			name="bankCode"
			value={card?.bankCode}
			class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{#each BANK_CATALOG as bank (bank.code)}
				<option value={bank.code}>{bank.name}</option>
			{/each}
		</select>
	</div>
	<div class="grid w-28 gap-2">
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
	<div class="grid w-24 gap-2">
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
	<div class="grid w-24 gap-2">
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
{/snippet}

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<h1 class="text-xl font-semibold">Cartões</h1>

	{#if canManage}
		<form method="POST" action="?/create" class="flex flex-wrap items-end gap-3" use:enhance>
			{@render cardFields('new')}
			<Button type="submit">Adicionar</Button>
		</form>
	{/if}

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		{#each data.cards as card (card.id)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				{#if editingId === card.id && canManage}
					<form
						method="POST"
						action="?/update"
						class="flex flex-1 flex-wrap items-end gap-3"
						use:enhance
					>
						<input type="hidden" name="cardId" value={card.id} />
						{@render cardFields(card.id, card)}
						<Button type="submit" size="sm">Salvar</Button>
						<a
							href={resolve('/cards')}
							class="text-sm text-muted-foreground underline-offset-4 hover:underline"
						>
							Cancelar
						</a>
					</form>
				{:else}
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
								{getBank(card.bankCode)?.name ?? card.bankCode} • fecha dia {card.closingDay} • vence
								dia {card.dueDay}
							</p>
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-3">
						<div class="text-right">
							<p class="text-sm font-medium">{formatCents(card.availableLimit)}</p>
							<p class="text-xs text-muted-foreground">de {formatCents(card.limit)}</p>
						</div>
						{#if canManage}
							<a
								href="{resolve('/cards')}?edit={card.id}"
								class="text-sm text-primary underline-offset-4 hover:underline"
							>
								Editar
							</a>
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
				{/if}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
		{/each}
	</div>
</div>
