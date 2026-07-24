<script lang="ts">
	import SignOut from 'phosphor-svelte/lib/SignOut';

	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();

	const canRename = $derived(
		data.activeWorkspace?.role === 'owner' || data.activeWorkspace?.role === 'admin'
	);
</script>

<svelte:head>
	<title>Configurações do workspace — Finance</title>
</svelte:head>

<div class="flex flex-col gap-6">
	{#if !canRename}
		<p class="text-sm text-muted-foreground">
			Só o dono ou um admin pode alterar as configurações deste workspace.
		</p>
	{/if}

	{#if canRename && data.activeWorkspace}
		<Card.Root>
			<Card.Header>
				<Card.Title>Renomear workspace</Card.Title>
				<Card.Description>Nome atual: {data.activeWorkspace.name}</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/rename" class="flex items-end gap-3" use:enhance>
					<div class="grid flex-1 gap-2">
						<Label for="rename-name">Novo nome</Label>
						<Input id="rename-name" name="name" value={data.activeWorkspace.name} required />
					</div>
					<Button type="submit">Salvar</Button>
				</form>
				{#if form?.renameMessage}
					<p class="mt-2 text-sm text-destructive">{form.renameMessage}</p>
				{/if}
				{#if form?.renamed}
					<p class="mt-2 text-sm text-success">Nome atualizado.</p>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Conta</Card.Title>
			<Card.Description>Conectado como {data.user.name}.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="/logout" use:enhance>
				<Button type="submit" variant="outline">
					<SignOut size={16} />
					Sair
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
