<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import { CategoryBadge } from '$lib/components/ui/category-badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CATEGORY_ICON_OPTIONS, resolveCategoryIcon } from '$lib/category-icon';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import type { DefaultCategoryView } from '$lib/server/admin-api';

	let { data, form } = $props();

	let createOpen = $state(false);
	let createError = $state<string | null>(null);
	let editing = $state<DefaultCategoryView | null>(null);
	let editError = $state<string | null>(null);
	/** Compartilhado entre os dois dialogs (só um fica aberto por vez). */
	let pickedIcon = $state('');
	let iconSearch = $state('');

	const filteredIcons = $derived(
		iconSearch.trim()
			? CATEGORY_ICON_OPTIONS.filter((slug) => slug.includes(iconSearch.trim().toLowerCase()))
			: CATEGORY_ICON_OPTIONS
	);

	function openCreate() {
		pickedIcon = '';
		iconSearch = '';
		createError = null;
		createOpen = true;
	}

	function openEdit(category: DefaultCategoryView) {
		pickedIcon = category.icon;
		iconSearch = '';
		editError = null;
		editing = category;
	}
</script>

<svelte:head>
	<title>Categorias padrão — SaaS</title>
</svelte:head>

{#snippet categoryFields(prefix: string, category?: DefaultCategoryView)}
	<div class="grid gap-2">
		<Label for="{prefix}-name">Nome</Label>
		<Input id="{prefix}-name" name="name" value={category?.name ?? ''} required />
	</div>
	<div class="grid gap-2">
		<div class="flex items-center justify-between">
			<Label>Ícone</Label>
			{#if pickedIcon}
				<span class="text-xs text-muted-foreground">Selecionado: {pickedIcon}</span>
			{/if}
		</div>
		<input type="hidden" name="icon" value={pickedIcon} required />
		<Input
			type="search"
			placeholder="Buscar ícone (ex.: cart, house, heart...)"
			bind:value={iconSearch}
		/>
		<div
			class="grid max-h-64 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border border-foreground/10 p-2"
		>
			{#each filteredIcons as slug (slug)}
				{@const OptionIcon = resolveCategoryIcon(slug)}
				<button
					type="button"
					onclick={() => (pickedIcon = slug)}
					title={slug}
					class="flex h-9 w-9 items-center justify-center rounded-lg transition-colors {pickedIcon ===
					slug
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'}"
				>
					<OptionIcon size={18} />
				</button>
			{:else}
				<p class="col-span-8 py-4 text-center text-sm text-muted-foreground">
					Nenhum ícone encontrado.
				</p>
			{/each}
		</div>
	</div>
	<div class="grid gap-2">
		<Label for="{prefix}-color">Cor</Label>
		<Input
			id="{prefix}-color"
			name="color"
			type="color"
			value={category?.color ?? '#6B7280'}
			class="h-9 w-16 p-1"
		/>
	</div>
	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" name="isFallback" value="true" checked={category?.isFallback ?? false} />
		É a categoria fallback (recebe transações de categorias excluídas)
	</label>
{/snippet}

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold">Categorias padrão</h1>
		<Button onclick={openCreate}>Adicionar categoria</Button>
	</div>

	<p class="text-sm text-muted-foreground">
		Templates copiados pra todo workspace novo (registro ou "criar workspace"). Mudar aqui não afeta
		workspaces já existentes.
	</p>

	<form method="GET" class="flex gap-2">
		<Input type="search" name="q" value={data.search} placeholder="Buscar por nome" />
		<Button type="submit">Buscar</Button>
	</form>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="flex flex-col gap-2">
		{#each data.categories as category (category.id)}
			<div
				class="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 px-4 py-3"
			>
				<div class="flex min-w-0 items-center gap-3">
					<CategoryBadge
						icon={resolveCategoryIcon(category.icon)}
						color={category.color}
						size={36}
						iconSize={18}
					/>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">
							{category.name}
							{#if category.isFallback}
								<span class="text-xs text-primary">(fallback)</span>
							{/if}
						</p>
					</div>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<Button variant="outline" size="sm" onclick={() => openEdit(category)}>Editar</Button>
					<form method="POST" action="?/remove" use:enhance>
						<input type="hidden" name="categoryId" value={category.id} />
						<Button
							type="submit"
							variant="destructive"
							size="sm"
							disabled={category.isFallback}
							title={category.isFallback
								? 'Marque outra categoria como fallback antes de excluir esta'
								: undefined}
						>
							Excluir
						</Button>
					</form>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">
				{data.search
					? `Nenhuma categoria encontrada pra "${data.search}".`
					: 'Nenhuma categoria padrão cadastrada.'}
			</p>
		{/each}
	</div>
</div>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Adicionar categoria padrão</Dialog.Title>
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
			{@render categoryFields('new')}
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
			<Dialog.Title>Editar categoria padrão</Dialog.Title>
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
				<input type="hidden" name="categoryId" value={editing.id} />
				{@render categoryFields('edit', editing)}
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
