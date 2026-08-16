<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { PUBLIC_SITE_URL } from '$env/static/public';

	import GoogleSignInButton from '$lib/components/auth/google-sign-in-button.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { PasswordInput } from '$lib/components/ui/password-input';
	import { PasswordRequirements } from '$lib/components/ui/password-requirements';

	let { form } = $props();

	let submitting = $state(false);
	let password = $state('');
	let confirmPassword = $state('');
</script>

<svelte:head>
	<title>Criar conta — Marcelus</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Criar conta</Card.Title>
			<Card.Description>A mesma conta vale pro app e pro dashboard.</Card.Description>
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
					<Label for="name">Nome</Label>
					<Input id="name" name="name" autocomplete="name" value={form?.name ?? ''} required />
					{#if form?.errors?.name}
						<p class="text-sm text-destructive">{form.errors.name}</p>
					{/if}
				</div>
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
					<Label for="password">Senha</Label>
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
					<Label for="confirmPassword">Confirmar senha</Label>
					<PasswordInput
						id="confirmPassword"
						name="confirmPassword"
						autocomplete="new-password"
						bind:value={confirmPassword}
						required
					/>
					{#if form?.errors?.confirmPassword}
						<p class="text-sm text-destructive">{form.errors.confirmPassword}</p>
					{/if}
				</div>
				<div class="flex items-start gap-2">
					<input id="terms" name="terms" type="checkbox" class="mt-1 accent-primary" required />
					<Label for="terms" class="block leading-relaxed font-normal text-muted-foreground">
						Li e aceito os
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
						<a href="{PUBLIC_SITE_URL}/pt/terms" target="_blank" rel="noopener" class="underline">
							termos de uso
						</a>
						e a
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
						<a href="{PUBLIC_SITE_URL}/pt/privacy" target="_blank" rel="noopener" class="underline">
							política de privacidade
						</a>
					</Label>
				</div>
				{#if form?.errors?.termsAccepted}
					<p class="text-sm text-destructive">{form.errors.termsAccepted}</p>
				{/if}
				{#if form?.message}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Criando conta…' : 'Criar conta'}
				</Button>
			</form>
			<GoogleSignInButton />
		</Card.Content>
		<Card.Footer>
			<p class="text-sm text-muted-foreground">
				Já tem conta?
				<a href={resolve('/login')} class="text-primary underline-offset-4 hover:underline"
					>Entrar</a
				>
			</p>
		</Card.Footer>
	</Card.Root>
</div>
