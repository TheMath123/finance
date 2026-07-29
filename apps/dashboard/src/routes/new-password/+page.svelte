<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { form } = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Nova senha — Finance</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Nova senha</Card.Title>
			<Card.Description>Escolha e confirme a sua nova senha.</Card.Description>
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
					<Label for="password">Nova senha</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						required
					/>
					{#if form?.errors?.password}
						<p class="text-sm text-destructive">{form.errors.password}</p>
					{/if}
				</div>
				<div class="grid gap-2">
					<Label for="confirmPassword">Confirmar nova senha</Label>
					<Input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
						required
					/>
					{#if form?.errors?.confirmPassword}
						<p class="text-sm text-destructive">{form.errors.confirmPassword}</p>
					{/if}
				</div>
				{#if form?.message}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Salvando…' : 'Redefinir senha'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
