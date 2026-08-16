<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import EyeIcon from 'phosphor-svelte/lib/Eye';
	import EyeClosedIcon from 'phosphor-svelte/lib/EyeClosed';
	import { cn, type WithElementRef } from '$lib/utils.js';

	/**
	 * Input de senha com olhinho pra alternar visibilidade — mesma casca visual
	 * do Input base, só que o `type` é controlado internamente (nunca aceita
	 * `type` de fora, sempre alterna entre "password"/"text"). Usado em toda
	 * tela que pede senha: login, cadastro, redefinição, troca de senha,
	 * exclusão de conta.
	 */
	type Props = WithElementRef<Omit<HTMLInputAttributes, 'type'>>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		id,
		...restProps
	}: Props = $props();

	let visible = $state(false);
</script>

<div class="relative">
	<input
		bind:this={ref}
		bind:value
		{id}
		type={visible ? 'text' : 'password'}
		class={cn(
			'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pr-9 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
			className
		)}
		{...restProps}
	/>
	<button
		type="button"
		onclick={() => (visible = !visible)}
		class="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
		aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
		aria-pressed={visible}
	>
		{#if visible}
			<EyeClosedIcon size={16} />
		{:else}
			<EyeIcon size={16} />
		{/if}
	</button>
</div>
