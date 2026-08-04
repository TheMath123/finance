<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { form } = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Novo workspace — Marcelus</title>
</svelte:head>

<div class="mx-auto flex max-w-md flex-col gap-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Novo workspace</Card.Title>
			<Card.Description>
				Um espaço separado pra dividir finanças com família ou equipe. Você vira o dono e pode
				convidar as pessoas depois, na aba Workspace.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				class="grid gap-4"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						submitting = false;
						await update();
					};
				}}
			>
				<div class="grid gap-2">
					<Label for="name">Nome do workspace</Label>
					<Input id="name" name="name" value={form?.name ?? ''} placeholder="Família" required />
				</div>
				{#if form?.message}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}
				<div class="flex items-center gap-3">
					<Button type="submit" disabled={submitting}>
						{submitting ? 'Criando…' : 'Criar workspace'}
					</Button>
					<a
						href={resolve('/')}
						class="text-sm text-muted-foreground underline-offset-4 hover:underline"
					>
						Cancelar
					</a>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
