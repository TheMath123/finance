<script lang="ts">
	import { Select } from 'bits-ui';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDown';
	import CheckIcon from 'phosphor-svelte/lib/Check';

	/**
	 * Dropdown próprio (não o <select> nativo do navegador) — o popup nativo do
	 * Chromium no Windows não respeita `color-scheme` de forma confiável, então
	 * no modo escuro a lista de opções aparecia sempre clara. Aqui o popup é
	 * HTML/CSS nosso, sem depender de nenhum comportamento do SO.
	 */
	let {
		value,
		onValueChange,
		options,
		ariaLabelledby
	}: {
		value: string;
		onValueChange: (value: string) => void;
		options: { value: string; label: string }[];
		ariaLabelledby: string;
	} = $props();

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');
</script>

<Select.Root type="single" {value} {onValueChange}>
	<Select.Trigger
		aria-labelledby={ariaLabelledby}
		class="flex h-9 w-full items-center justify-between rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
	>
		{selectedLabel}
		<CaretDownIcon size={14} class="text-muted-foreground" />
	</Select.Trigger>
	<Select.Portal>
		<Select.Content
			align="start"
			class="z-50 w-[var(--bits-floating-anchor-width)] min-w-[8rem] rounded-lg border border-foreground/10 bg-popover p-1 text-popover-foreground shadow-md outline-none"
		>
			{#each options as option (option.value)}
				<Select.Item
					value={option.value}
					label={option.label}
					class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-primary/10"
				>
					{option.label}
					{#if value === option.value}
						<CheckIcon size={14} />
					{/if}
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Portal>
</Select.Root>
