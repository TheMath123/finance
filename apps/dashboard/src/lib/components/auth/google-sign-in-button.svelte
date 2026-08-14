<script lang="ts">
	import { onMount } from 'svelte';

	import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';

	import type { GoogleCredentialResponse } from './google-identity';

	/**
	 * Login social com Google via Google Identity Services (GIS) — script
	 * carregado direto do Google, sem SDK/pacote novo. O `callback` recebe o
	 * ID token (`credential`) no próprio JS do browser; a verificação de
	 * verdade acontece no backend (`POST /auth/google`), este componente só
	 * repassa o token pro endpoint `/login/google` da própria dashboard.
	 * Tipagem do `window.google` fica em ./google-identity.d.ts.
	 */

	let container = $state<HTMLDivElement>();
	let error = $state('');

	async function handleCredential(response: GoogleCredentialResponse) {
		error = '';
		try {
			const res = await fetch('/login/google', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken: response.credential })
			});
			const payload = (await res.json()) as { ok?: boolean; error?: { message: string } };
			if (!res.ok || !payload.ok) {
				error = payload.error?.message ?? 'Não foi possível entrar com o Google.';
				return;
			}
			window.location.href = '/';
		} catch {
			error = 'Não foi possível falar com o servidor. Tente novamente.';
		}
	}

	onMount(() => {
		if (!PUBLIC_GOOGLE_CLIENT_ID || !container) return;

		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.async = true;
		script.onload = () => {
			if (!window.google || !container) return;
			window.google.accounts.id.initialize({
				client_id: PUBLIC_GOOGLE_CLIENT_ID,
				callback: handleCredential
			});
			window.google.accounts.id.renderButton(container, {
				theme: 'outline',
				size: 'large',
				width: 320,
				text: 'continue_with',
				locale: 'pt-BR'
			});
		};
		document.head.appendChild(script);

		return () => {
			script.remove();
		};
	});
</script>

{#if PUBLIC_GOOGLE_CLIENT_ID}
	<div class="my-4 flex items-center gap-2">
		<div class="h-px flex-1 bg-border"></div>
		<span class="text-xs text-muted-foreground">ou</span>
		<div class="h-px flex-1 bg-border"></div>
	</div>
	<div class="grid gap-2">
		<div class="flex justify-center" bind:this={container}></div>
		<p class="text-center text-xs text-muted-foreground">
			Ao continuar, você concorda com os Termos de Uso.
		</p>
		{#if error}
			<p class="text-center text-sm text-destructive">{error}</p>
		{/if}
	</div>
{/if}
