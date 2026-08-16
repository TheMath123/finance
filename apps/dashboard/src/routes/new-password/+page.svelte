<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { PasswordInput } from '$lib/components/ui/password-input';
	import { PasswordRequirements } from '$lib/components/ui/password-requirements';

	let { form } = $props();

	let submitting = $state(false);
	let password = $state('');
</script>

<svelte:head>
	<title>Nova senha — Marcelus</title>
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
					<PasswordInput
						id="password"
						name="password"
						autocomplete="new-password"
						bind:value={password}
						aria-describedby="password-requirements"
						required
					/>
					{#if form?.errors?.password}
						<p class="text-sm text-destructive">{form.errors.password}</p>
					{/if}
					<PasswordRequirements id="password-requirements" {password} />
				</div>
				<div class="grid gap-2">
					<Label for="confirmPassword">Confirmar nova senha</Label>
					<PasswordInput
						id="confirmPassword"
						name="confirmPassword"
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
