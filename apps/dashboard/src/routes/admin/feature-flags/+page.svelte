<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();

	let createOpen = $state(false);

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
	<title>Feature flags — Admin</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold">Feature flags</h1>
		<Button onclick={() => (createOpen = true)}>Nova flag</Button>
	</div>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="flex flex-col gap-2">
		{#each data.flags as flag (flag.id)}
			<div
				class="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 px-4 py-3"
			>
				<div class="min-w-0">
					<p class="truncate text-sm font-medium">{flag.key}</p>
					{#if flag.description}
						<p class="truncate text-sm text-muted-foreground">{flag.description}</p>
					{/if}
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<form method="POST" action="?/toggle" use:enhance>
						<input type="hidden" name="key" value={flag.key} />
						<input type="hidden" name="enabled" value={(!flag.enabled).toString()} />
						<Button type="submit" variant={flag.enabled ? 'default' : 'outline'} size="sm">
							{flag.enabled ? 'Ativa' : 'Inativa'}
						</Button>
					</form>
					<form method="POST" action="?/remove" use:enhance>
						<input type="hidden" name="key" value={flag.key} />
						<Button type="submit" variant="destructive" size="sm">Excluir</Button>
					</form>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhuma feature flag cadastrada.</p>
		{/each}
	</div>
</div>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Nova feature flag</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/upsert"
			class="grid gap-4"
			use:enhance={() => closeOnSuccess(() => (createOpen = false))}
		>
			<div class="grid gap-2">
				<Label for="key">Chave</Label>
				<Input id="key" name="key" placeholder="minha-flag" required />
			</div>
			<div class="grid gap-2">
				<Label for="description">Descrição</Label>
				<Input id="description" name="description" />
			</div>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" name="enabled" value="true" />
				Já criar ativada
			</label>
			<Dialog.Footer>
				<Button type="submit">Criar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
