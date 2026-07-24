<script lang="ts">
	import { BANK_CATALOG, getBank } from '@finance/shared';

	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();

	const canManage = $derived(
		data.activeWorkspace?.role === 'owner' || data.activeWorkspace?.role === 'admin'
	);
	const editingId = $derived(page.url.searchParams.get('edit'));
</script>

<svelte:head>
	<title>Bancos — Finance</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<h1 class="text-xl font-semibold">Bancos</h1>

	{#if canManage}
		<form method="POST" action="?/create" class="flex flex-wrap items-end gap-3" use:enhance>
			<div class="grid min-w-48 flex-1 gap-2">
				<Label for="name">Nome</Label>
				<Input
					id="name"
					name="name"
					value={form?.name ?? ''}
					placeholder="Nubank pessoal"
					required
				/>
			</div>
			<div class="grid gap-2">
				<Label for="bankCode">Banco</Label>
				<select
					id="bankCode"
					name="bankCode"
					class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{#each BANK_CATALOG as bank (bank.code)}
						<option value={bank.code}>{bank.name}</option>
					{/each}
				</select>
			</div>
			<Button type="submit">Adicionar</Button>
		</form>
	{/if}

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		{#each data.banks as bank (bank.id)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				{#if editingId === bank.id && canManage}
					<form
						method="POST"
						action="?/update"
						class="flex flex-1 flex-wrap items-end gap-3"
						use:enhance
					>
						<input type="hidden" name="bankId" value={bank.id} />
						<div class="grid min-w-40 flex-1 gap-2">
							<Label for="edit-name-{bank.id}">Nome</Label>
							<Input id="edit-name-{bank.id}" name="name" value={bank.name} required />
						</div>
						<div class="grid gap-2">
							<Label for="edit-code-{bank.id}">Banco</Label>
							<select
								id="edit-code-{bank.id}"
								name="bankCode"
								value={bank.bankCode}
								class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{#each BANK_CATALOG as option (option.code)}
									<option value={option.code}>{option.name}</option>
								{/each}
							</select>
						</div>
						<Button type="submit" size="sm">Salvar</Button>
						<a
							href={resolve('/banks')}
							class="text-sm text-muted-foreground underline-offset-4 hover:underline"
						>
							Cancelar
						</a>
					</form>
				{:else}
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
							<a
								href="{resolve('/banks')}?edit={bank.id}"
								class="text-sm text-primary underline-offset-4 hover:underline"
							>
								Editar
							</a>
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
				{/if}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum banco cadastrado ainda.</p>
		{/each}
	</div>
</div>
