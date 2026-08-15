<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';

	import { PUBLIC_CLARITY_PROJECT_ID } from '$env/static/public';

	import './layout.css';

	let { children } = $props();

	// Heatmap + gravação de sessão (analytics). Sem project ID configurado,
	// o script nem é injetado — `{@html}` porque o snippet do Clarity
	// precisa do project ID interpolado dentro do próprio <script>, e o
	// Svelte não expande `{...}` dentro de tags <script> de template.
	const clarityScript = PUBLIC_CLARITY_PROJECT_ID
		? `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window, document, "clarity", "script", "${PUBLIC_CLARITY_PROJECT_ID}");</` +
			`script>`
		: null;
</script>

<svelte:head>
	{#if clarityScript}
		{@html clarityScript}
	{/if}
</svelte:head>

<!-- Favicon já é servido por /favicon.svg (static/) via <link> em app.html — sem duplicar aqui. -->
<ModeWatcher />
{@render children()}
