<script lang="ts">
	import { PASSWORD_REGULAR_REQUIREMENTS } from '@finance/shared';
	import CheckCircleIcon from 'phosphor-svelte/lib/CheckCircle';
	import CircleIcon from 'phosphor-svelte/lib/Circle';
	import { cn } from '$lib/utils.js';

	/**
	 * Checklist visual dos requisitos da senha `regular` (política única em
	 * @finance/shared, mesma usada no Zod do form e da API) — reage a cada
	 * tecla digitada. É só feedback incremental de UI: quem valida de verdade
	 * no submit continua sendo o schema Zod.
	 */
	let { password = '', id }: { password?: string; id?: string } = $props();

	const metCount = $derived(
		PASSWORD_REGULAR_REQUIREMENTS.filter((requirement) => requirement.test(password)).length
	);
</script>

<div {id}>
	<span class="sr-only" aria-live="polite">
		{metCount} de {PASSWORD_REGULAR_REQUIREMENTS.length} requisitos da senha atendidos
	</span>
	<ul class="mt-1.5 space-y-1 text-xs">
		{#each PASSWORD_REGULAR_REQUIREMENTS as requirement (requirement.key)}
			{@const met = requirement.test(password)}
			<li
				class={cn(
					'flex items-center gap-1.5 transition-colors',
					met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
				)}
			>
				{#if met}
					<CheckCircleIcon size={14} weight="fill" />
				{:else}
					<CircleIcon size={14} />
				{/if}
				{requirement.label}
			</li>
		{/each}
	</ul>
</div>
