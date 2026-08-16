<script lang="ts">
	import { Select } from 'bits-ui';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDown';
	import CheckIcon from 'phosphor-svelte/lib/Check';
	import { cn } from '$lib/utils.js';

	/**
	 * Dropdown próprio (não o <select> nativo do navegador) — mesmo motivo do
	 * lib/components/calculator/select-field.svelte: o popup nativo do Chromium
	 * no Windows não respeita `color-scheme` de forma confiável, então no modo
	 * escuro a lista de opções aparecia sempre clara/ilegível. Aqui o popup é
	 * HTML/CSS nosso (tokens do tema), sem depender de nenhum comportamento do
	 * SO. Generalizado (com `name`) pra qualquer form — o da calculadora não
	 * precisava de `name` porque nunca vive dentro de um <form> nativo.
	 */
	let {
		value,
		onValueChange,
		options,
		placeholder,
		name,
		id,
		disabled = false,
		required = false,
		class: className
	}: {
		value?: string;
		onValueChange?: (value: string) => void;
		options: { value: string; label: string }[];
		placeholder?: string;
		name?: string;
		id?: string;
		disabled?: boolean;
		required?: boolean;
		class?: string;
	} = $props();

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label);
</script>

<Select.Root type="single" {value} {onValueChange} {name} {disabled} {required}>
	<Select.Trigger
		{id}
		class={cn(
			'flex h-9 w-full items-center justify-between rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
	>
		<span class={selectedLabel ? '' : 'text-muted-foreground'}>
			{selectedLabel ?? placeholder ?? ''}
		</span>
		<CaretDownIcon size={14} class="shrink-0 text-muted-foreground" />
	</Select.Trigger>
	<Select.Portal>
		<Select.Content
			class="z-50 max-h-[300px] min-w-[8rem] overflow-y-auto rounded-lg border border-foreground/10 bg-popover p-1 text-popover-foreground shadow-md outline-none"
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
