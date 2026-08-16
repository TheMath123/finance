<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();

	// E-mail não é mais editável aqui — já foi decidido na tela anterior
	// (/forgot-password) e chega via query string; reexibir como input dava a
	// entender (errado) que dava pra trocar de destinatário nesta etapa.
	const email = $derived(data.email);

	let submitting = $state(false);
	let resending = $state(false);
	let resendMessage = $state<string | null>(null);

	/** Mesmo valor do cooldown real do backend (FORGOT_PASSWORD_COOLDOWN_MS em
	 *  forgot-password.ts) — mostrar um número diferente aqui só enganaria o
	 *  usuário, já que o servidor descarta silenciosamente qualquer pedido
	 *  antes disso (OWASP: nunca revela o throttle na resposta). */
	const RESEND_COOLDOWN_MS = 10 * 60 * 1000;

	function cooldownKey(forEmail: string): string {
		return `resetCodeCooldown:${forEmail}`;
	}

	let resendAvailableAt = $state(0);
	let now = $state(Date.now());

	// Restaura o cooldown do localStorage (sobrevive reload/nova visita com o
	// mesmo e-mail) — se não existir ainda, assume que o código acabou de ser
	// enviado agora (é exatamente o que aconteceu: esta página só é alcançada
	// depois de um envio bem-sucedido em /forgot-password) e já grava.
	$effect(() => {
		if (!browser || !email) return;
		const key = cooldownKey(email);
		const stored = Number(localStorage.getItem(key) ?? 0);
		if (stored > now) {
			resendAvailableAt = stored;
		} else {
			resendAvailableAt = Date.now() + RESEND_COOLDOWN_MS;
			localStorage.setItem(key, String(resendAvailableAt));
		}
	});

	// Ticker de 1s só enquanto o cooldown está de fato ativo.
	$effect(() => {
		if (!browser || now >= resendAvailableAt) return;
		const interval = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(interval);
	});

	const cooldownRemainingMs = $derived(Math.max(0, resendAvailableAt - now));
	const onCooldown = $derived(cooldownRemainingMs > 0);
	const cooldownLabel = $derived.by(() => {
		const totalSeconds = Math.ceil(cooldownRemainingMs / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `Reenviar em ${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	/** Fora do form principal de propósito — reenviar não deve navegar nem validar o código já digitado. */
	async function resendCode() {
		if (!email || onCooldown) return;
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
		if (response.ok && browser) {
			resendAvailableAt = Date.now() + RESEND_COOLDOWN_MS;
			now = Date.now();
			localStorage.setItem(cooldownKey(email), String(resendAvailableAt));
		}
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
				Informe o código de 6 dígitos enviado para
				<span class="font-medium text-foreground">{email}</span>.
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
				<input type="hidden" name="email" value={email} />
				<div class="grid gap-2">
					<Label for="code">Código</Label>
					<Input
						id="code"
						name="code"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength={6}
						value={form?.code ?? ''}
						autofocus
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
				disabled={resending || onCooldown || !email}
				onclick={resendCode}
			>
				{resending ? 'Reenviando…' : onCooldown ? cooldownLabel : 'Reenviar código'}
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
