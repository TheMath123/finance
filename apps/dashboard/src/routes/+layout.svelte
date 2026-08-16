<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';

	import { PUBLIC_CLARITY_PROJECT_ID } from '$env/static/public';

	import CookieConsentBanner from '$lib/components/layout/cookie-consent-banner.svelte';
	import { getConsent, loadClarity, type ConsentValue } from '$lib/cookie-consent';

	import './layout.css';

	let { children } = $props();

	const OG_DESCRIPTION = 'Organização financeira pessoal e compartilhada.';

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

<svelte:head>
	<!-- Preview de link (Discord/WhatsApp/Slack/etc.) quando a URL do dashboard
	     é compartilhada — mesmo og-image.png do site institucional, pra manter
	     a mesma identidade visual nos dois domínios. -->
	<meta property="og:site_name" content="Marcelus" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Marcelus" />
	<meta property="og:description" content={OG_DESCRIPTION} />
	<meta property="og:image" content="https://dash.marcelus.app/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="https://dash.marcelus.app/og-image.png" />
</svelte:head>

<!-- Favicon já é servido por /favicon.svg (static/) via <link> em app.html — sem duplicar aqui. -->
<!-- defaultMode="light" + track={false}: a aplicação sempre abre no modo claro,
     não segue a preferência de dark mode do sistema operacional do visitante
     (decisão de produto — muita gente tem o SO em dark por hábito, sem
     relação com o que prefere neste app). Sem toggle manual na UI hoje; o
     modo escuro continua existindo e corretamente estilizado (ver layout.css),
     só não é mais o ponto de entrada automático. -->
<ModeWatcher defaultMode="light" track={false} />
<CookieConsentBanner onConsent={handleConsent} />
{@render children()}
