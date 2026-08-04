<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();

	let email = $state(form?.email ?? data.email);
	let submitting = $state(false);
	let resending = $state(false);
	let resendMessage = $state<string | null>(null);

	/** Fora do form principal de propósito — reenviar não deve navegar nem validar o código já digitado. */
	async function resendCode() {
		if (!email) return;
		resending = true;
		resendMessage = null;
		const response = await fetch('?/resend', {
			method: 'POST',
			body: new URLSearchParams({ email })
		});
		resending = false;
		// `response.ok` já basta pra distinguir sucesso de erro real (ex.: 429 por
		// IP) — o cooldown por e-mail continua indistinguível de sucesso de
		// propósito (OWASP), então não dá (nem deve) mostrar mensagem diferente
		// pra esse caso especificamente.
		resendMessage = response.ok
			? 'Novo código enviado — confira seu e-mail.'
			: 'Não foi possível reenviar agora. Tente novamente em alguns minutos.';
	}
</script>

<svelte:head>
	<title>Redefinir senha — Marcelus</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Redefinir senha</Card.Title>
			<Card.Description>
				Confirme seu e-mail e informe o código de 6 dígitos recebido.
			</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-3">
			<form
				method="POST"
				action="?/verify"
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
						bind:value={email}
						required
					/>
					{#if form?.errors?.email}
						<p class="text-sm text-destructive">{form.errors.email}</p>
					{/if}
				</div>
				<div class="grid gap-2">
					<Label for="code">Código</Label>
					<Input
						id="code"
						name="code"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength={6}
						value={form?.code ?? ''}
						required
					/>
					{#if form?.errors?.code}
						<p class="text-sm text-destructive">{form.errors.code}</p>
					{/if}
				</div>
				{#if form?.message}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Verificando…' : 'Verificar código'}
				</Button>
			</form>

			{#if resendMessage}
				<p class="text-center text-sm text-muted-foreground">{resendMessage}</p>
			{/if}
			<Button
				type="button"
				variant="ghost"
				class="w-full"
				disabled={resending || !email}
				onclick={resendCode}
			>
				{resending ? 'Reenviando…' : 'Reenviar código'}
			</Button>
		</Card.Content>
		<Card.Footer>
			<p class="text-sm text-muted-foreground">
				<a href={resolve('/login')} class="text-primary underline-offset-4 hover:underline">
					Voltar para o login
				</a>
			</p>
		</Card.Footer>
	</Card.Root>
</div>
