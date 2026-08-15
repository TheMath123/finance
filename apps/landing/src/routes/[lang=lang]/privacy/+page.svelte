<script lang="ts">
	import { PRIVACY } from '$lib/i18n/legal-content';
	import type { Lang } from '../../../params/lang';

	let { data } = $props();

	const page = $derived(PRIVACY[data.lang as Lang]);
</script>

<svelte:head>
	<title>{page.title} — Marcelus</title>
</svelte:head>

<section class="mx-auto max-w-3xl px-6 py-16">
	<h1 class="text-3xl font-bold">{page.title}</h1>
	<p class="mt-2 text-sm text-muted-foreground">{page.updatedAt}</p>
	<p class="mt-6 text-muted-foreground">{page.intro}</p>

	<div class="mt-10 flex flex-col gap-8">
		{#each page.sections as section (section.heading)}
			<div>
				<h2 class="text-lg font-semibold">{section.heading}</h2>
				<div class="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
					{#each section.paragraphs as paragraph (paragraph)}
						<p>{paragraph}</p>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
