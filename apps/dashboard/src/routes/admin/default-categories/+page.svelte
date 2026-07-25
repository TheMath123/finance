<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CATEGORY_ICON_OPTIONS, resolveCategoryIcon } from '$lib/category-icon';
	import type { DefaultCategoryView } from '$lib/server/admin-api';

	let { data, form } = $props();

	let createOpen = $state(false);
	let editing = $state<DefaultCategoryView | null>(null);
	/** Compartilhado entre os dois dialogs (só um fica aberto por vez). */
	let pickedIcon = $state('');

	function openCreate() {
		pickedIcon = '';
		createOpen = true;
	}

	function openEdit(category: DefaultCategoryView) {
		pickedIcon = category.icon;
		editing = category;
	}

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
	<title>Categorias padrão — Admin</title>
</svelte:head>

{#snippet categoryFields(prefix: string, category?: DefaultCategoryView)}
	<div class="grid gap-2">
		<Label for="{prefix}-name">Nome</Label>
		<Input id="{prefix}-name" name="name" value={category?.name ?? ''} required />
	</div>
	<div class="grid gap-2">
		<Label>Ícone</Label>
		<input type="hidden" name="icon" value={pickedIcon} required />
		<div
			class="grid max-h-48 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border border-foreground/10 p-2"
		>
			{#each CATEGORY_ICON_OPTIONS as slug (slug)}
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

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="flex flex-col gap-2">
		{#each data.categories as category (category.id)}
			{@const CategoryIcon = resolveCategoryIcon(category.icon)}
			<div
				class="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 px-4 py-3"
			>
				<div class="flex min-w-0 items-center gap-3">
					<span
						class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
						style="background-color: {category.color}"
					>
						<CategoryIcon size={18} weight="fill" />
					</span>
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
			<p class="text-sm text-muted-foreground">Nenhuma categoria padrão cadastrada.</p>
		{/each}
	</div>
</div>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Adicionar categoria padrão</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/create"
			class="grid gap-4"
			use:enhance={() => closeOnSuccess(() => (createOpen = false))}
		>
			{@render categoryFields('new')}
			<Dialog.Footer>
				<Button type="submit">Adicionar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={editing !== null} onOpenChange={(open) => !open && (editing = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Editar categoria padrão</Dialog.Title>
		</Dialog.Header>
		{#if editing}
			<form
				method="POST"
				action="?/update"
				class="grid gap-4"
				use:enhance={() => closeOnSuccess(() => (editing = null))}
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
