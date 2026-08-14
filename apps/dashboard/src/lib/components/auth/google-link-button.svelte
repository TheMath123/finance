<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';

	import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';

	import { renderGoogleButton } from '$lib/google-identity';

	import type { GoogleCredentialResponse } from './google-identity';

	/**
	 * Vínculo de conta Google pelo perfil (M5-07) — mesma base de
	 * `google-sign-in-button.svelte` (`$lib/google-identity.ts`), mas o
	 * callback preenche um form oculto e o submete pra action `?/linkGoogle`
	 * de `account/+page.server.ts`, em vez de fazer `fetch` pra um endpoint
	 * dedicado — segue o mesmo padrão form+action já usado no resto da
	 * página de conta.
	 */

	let container = $state<HTMLDivElement>();
	let formEl = $state<HTMLFormElement>();
	let idTokenValue = $state('');
	let submitting = $state(false);

	function handleCredential(response: GoogleCredentialResponse) {
		idTokenValue = response.credential;
		formEl?.requestSubmit();
	}

	onMount(() => {
		if (!PUBLIC_GOOGLE_CLIENT_ID || !container) return;
		return renderGoogleButton(container, PUBLIC_GOOGLE_CLIENT_ID, handleCredential);
	});
</script>

{#if PUBLIC_GOOGLE_CLIENT_ID}
	<form
		method="POST"
		action="?/linkGoogle"
		class="hidden"
		bind:this={formEl}
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<input type="hidden" name="idToken" value={idTokenValue} />
	</form>
	<div class="flex justify-center" bind:this={container} aria-busy={submitting}></div>
{/if}
