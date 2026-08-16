<script lang="ts">
	import { resolve } from '$app/paths';

	import { getConsent, setConsent, type ConsentValue } from '$lib/cookie-consent';
	import type { Messages } from '$lib/i18n/messages';
	import type { Lang } from '../../params/lang';

	let { t, lang }: { t: Messages['cookieConsent']; lang: Lang } = $props();

	// `dismissed` cobre o clique explícito (esconde na hora, sem esperar
	// reler o cookie); `visible` deriva de `getConsent()` — só é lido de
	// verdade no client (SSR não tem `document.cookie`, então nunca mostra
	// o banner por engano durante a renderização do servidor).
	let dismissed = $state(false);
	let visible = $derived(!dismissed && getConsent() === null);

	function choose(value: ConsentValue) {
		setConsent(value);
		dismissed = true;
	}
</script>

{#if visible}
	<div
		class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-4 py-5 sm:px-6"
		role="region"
		aria-label="Cookie consent"
	>
		<div
			class="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-sm text-muted-foreground">
				{t.text}
				<a href={resolve(`/${lang}/privacy`)} class="underline hover:text-foreground">
					{t.learnMore}
				</a>.
			</p>
			<div class="flex shrink-0 gap-3">
				<button
					type="button"
					onclick={() => choose('necessary')}
					class="border border-foreground/30 px-4 py-2.5 text-xs font-medium tracking-wide uppercase transition-colors hover:border-foreground hover:bg-accent"
				>
					{t.necessaryOnly}
				</button>
				<button
					type="button"
					onclick={() => choose('all')}
					class="bg-foreground px-4 py-2.5 text-xs font-medium tracking-wide text-background uppercase transition-opacity hover:opacity-85"
				>
					{t.acceptAll}
				</button>
			</div>
		</div>
	</div>
{/if}
