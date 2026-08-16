<script lang="ts">
	import { PRIVACY } from '$lib/i18n/legal-content';
	import type { Lang } from '../../../params/lang';

	let { data } = $props();

	const page = $derived(PRIVACY[data.lang as Lang]);
</script>

<svelte:head>
	<title>{page.title} — Marcelus</title>
</svelte:head>

<section class="mx-auto max-w-2xl px-6 pt-20 pb-24 sm:pt-28">
	<h1 class="font-display text-4xl tracking-tight sm:text-5xl">{page.title}</h1>
	<p class="mt-3 text-xs tracking-wide text-muted-foreground uppercase">{page.updatedAt}</p>
	<p class="mt-8 text-muted-foreground">{page.intro}</p>

	<div class="mt-14 flex flex-col">
		{#each page.sections as section (section.heading)}
			<div class="border-t border-border py-8 first:pt-0">
				<h2 class="font-display text-lg tracking-tight">{section.heading}</h2>
				<div class="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
					{#each section.paragraphs as paragraph (paragraph)}
						<p>{paragraph}</p>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
