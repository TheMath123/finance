<script lang="ts">
	import { PUBLIC_SITE_URL } from '$env/static/public';

	import { Button } from '$lib/components/ui/button';
	import { getConsent, setConsent, type ConsentValue } from '$lib/cookie-consent';

	let { onConsent }: { onConsent: (value: ConsentValue) => void } = $props();

	// `dismissed` cobre o clique explícito (esconde na hora, sem esperar
	// reler o cookie); `visible` deriva de `getConsent()` — só é lido de
	// verdade no client (SSR não tem `document.cookie`, então nunca mostra
	// o banner por engano durante a renderização do servidor).
	let dismissed = $state(false);
	let visible = $derived(!dismissed && getConsent() === null);

	function choose(value: ConsentValue) {
		setConsent(value);
		dismissed = true;
		onConsent(value);
	}
</script>

{#if visible}
	<div
		class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-4 py-4 shadow-lg sm:px-6"
		role="region"
		aria-label="Consentimento de cookies"
	>
		<div
			class="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-sm text-muted-foreground">
				Usamos cookies necessários pro funcionamento do app (sua sessão de login) e, com sua
				permissão, cookies de análise (Microsoft Clarity) pra entender como o produto é usado.
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- link externo (outra app/domínio) -->
				<a href="{PUBLIC_SITE_URL}/pt/privacy" class="underline hover:text-foreground">
					Saiba mais
				</a>.
			</p>
			<div class="flex shrink-0 gap-2">
				<Button variant="outline" size="sm" onclick={() => choose('necessary')}>
					Somente necessários
				</Button>
				<Button size="sm" onclick={() => choose('all')}>Aceitar todos</Button>
			</div>
		</div>
	</div>
{/if}
