<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';

	import { PUBLIC_CLARITY_PROJECT_ID } from '$env/static/public';

	import CookieConsentBanner from '$lib/components/layout/cookie-consent-banner.svelte';
	import { getConsent, loadClarity, type ConsentValue } from '$lib/cookie-consent';

	import './layout.css';

	let { children } = $props();

	// Heatmap + gravação de sessão (analytics) — só carrega depois de
	// consentimento (banner de cookies), nunca incondicionalmente: sem
	// project ID configurado OU sem consentimento pra cookies de rastreio,
	// o script simplesmente não é injetado. Ver $lib/cookie-consent.ts.
	$effect(() => {
		if (PUBLIC_CLARITY_PROJECT_ID && getConsent() === 'all') {
			loadClarity(PUBLIC_CLARITY_PROJECT_ID);
		}
	});

	function handleConsent(value: ConsentValue) {
		if (value === 'all' && PUBLIC_CLARITY_PROJECT_ID) loadClarity(PUBLIC_CLARITY_PROJECT_ID);
	}
</script>

<!-- Favicon já é servido por /favicon.svg (static/) via <link> em app.html — sem duplicar aqui. -->
<ModeWatcher />
<CookieConsentBanner onConsent={handleConsent} />
{@render children()}
