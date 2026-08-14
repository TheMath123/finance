<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	import GoogleSignInButton from '$lib/components/auth/google-sign-in-button.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { form } = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Entrar — Marcelus</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Entrar</Card.Title>
			<Card.Description>Acesse o dashboard com a mesma conta do app.</Card.Description>
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
					<Label for="email">E-mail</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						value={form?.email ?? ''}
						required
					/>
					{#if form?.errors?.email}
						<p class="text-sm text-destructive">{form.errors.email}</p>
					{/if}
				</div>
				<div class="grid gap-2">
					<div class="flex items-center justify-between">
						<Label for="password">Senha</Label>
					</div>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
					/>
					{#if form?.errors?.password}
						<p class="text-sm text-destructive">{form.errors.password}</p>
					{/if}
					<a
						href={resolve('/forgot-password')}
						class="text-xs text-primary underline-offset-4 hover:underline"
					>
						Esqueci minha senha
					</a>
				</div>
				{#if form?.message}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Entrando…' : 'Entrar'}
				</Button>
			</form>
			<GoogleSignInButton />
		</Card.Content>
		<Card.Footer>
			<p class="text-sm text-muted-foreground">
				Não tem conta?
				<a href={resolve('/register')} class="text-primary underline-offset-4 hover:underline"
					>Criar conta</a
				>
			</p>
		</Card.Footer>
	</Card.Root>
</div>
