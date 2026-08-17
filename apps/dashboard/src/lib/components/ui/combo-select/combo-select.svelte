<script lang="ts">
	import { Combobox } from 'bits-ui';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDown';
	import CheckIcon from 'phosphor-svelte/lib/Check';
	import TagIcon from 'phosphor-svelte/lib/TagIcon';
	import { CategoryBadge } from '$lib/components/ui/category-badge';
	import { cn } from '$lib/utils.js';

	// Mesmo truque de $lib/category-icon.ts: não há subpath exportado pro tipo
	// de props dos ícones Phosphor, então deriva do componente em si.
	type IconComponent = typeof TagIcon;

	export interface ComboSelectOption {
		value: string;
		label: string;
		/** Ícone Phosphor já resolvido (ex.: `resolveCategoryIcon(category.icon)`) — o
		 *  componente não sabe nada de slug/Phosphor, só desenha o que recebe. */
		icon?: IconComponent;
		/** Cor de fundo da bolinha do ícone — só importa se `icon` também vier. */
		color?: string;
	}

	/**
	 * Select com busca (combobox) — mistura o Select customizado (ui/select,
	 * mesmo motivo de existir: popup nativo do <select> ilegível no dark mode)
	 * com uma busca embutida, pra listas longas ou com bolinha colorida + ícone
	 * por opção (categorias é o primeiro caso, mas serve pra qualquer lista
	 * buscável). Não usa full-text search do Postgres — a lista inteira já
	 * chegou pro client, filtrar 10-100 itens em memória é instantâneo e não
	 * justifica round-trip ao servidor.
	 *
	 * IMPORTANTE (bits-ui): o `Combobox.Input` É o próprio elemento que serve
	 * de âncora de posicionamento do popover — precisa estar montado sempre,
	 * nunca só dentro do conteúdo do popup (senão a primeira abertura não tem
	 * onde se ancorar e o componente parece travado/sem reação a clique).
	 * Por isso aqui o input substitui o botão-gatilho tradicional: ele já é a
	 * caixa fechada (mostra o valor selecionado) e, ao focar, vira a busca.
	 */
	let {
		value = $bindable(),
		onValueChange,
		options,
		placeholder,
		searchPlaceholder = 'Buscar...',
		emptyText = 'Nenhum resultado encontrado.',
		name,
		id,
		disabled = false,
		required = false,
		class: className
	}: {
		value?: string;
		onValueChange?: (value: string) => void;
		options: ComboSelectOption[];
		placeholder?: string;
		searchPlaceholder?: string;
		emptyText?: string;
		name?: string;
		id?: string;
		disabled?: boolean;
		required?: boolean;
		class?: string;
	} = $props();

	const selected = $derived(options.find((o) => o.value === value));

	let open = $state(false);
	// Busca em memória, sem acento (mesma técnica usada em saas/plans) — o
	// texto digitado nunca dirige o valor selecionado, só filtra a lista.
	let search = $state('');
	const DIACRITICS_PATTERN = /[̀-ͯ]/g;
	function normalize(text: string): string {
		return text.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase();
	}
	const filteredOptions = $derived.by(() => {
		const query = normalize(search.trim());
		if (!query) return options;
		return options.filter((option) => normalize(option.label).includes(query));
	});

	// Fechado: mostra o rótulo selecionado. Aberto: mostra o que foi digitado
	// (recomeça vazio a cada abertura — nunca mistura busca com seleção).
	const displayValue = $derived(open ? search : (selected?.label ?? ''));

	function handleOpenChange(next: boolean) {
		open = next;
		if (!next) search = '';
	}
</script>

<Combobox.Root
	type="single"
	bind:value
	{onValueChange}
	bind:open
	inputValue={displayValue}
	{name}
	{disabled}
	{required}
	onOpenChange={handleOpenChange}
>
	<div class="relative">
		{#if selected?.icon && !open}
			<CategoryBadge
				icon={selected.icon}
				color={selected.color ?? '#6B7280'}
				size={24}
				iconSize={13}
				class="pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2"
			/>
		{/if}
		<Combobox.Input
			{id}
			placeholder={placeholder ?? searchPlaceholder}
			onfocus={() => (open = true)}
			oninput={(e) => {
				open = true;
				search = e.currentTarget.value;
			}}
			class={cn(
				'h-9 w-full min-w-0 rounded-lg border border-foreground/10 bg-transparent pr-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
				selected?.icon && !open ? 'pl-9' : 'pl-3',
				className
			)}
		/>
		<CaretDownIcon
			size={14}
			class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
		/>
	</div>
	<Combobox.Portal>
		<Combobox.Content
			align="start"
			class="z-50 flex max-h-[280px] w-[var(--bits-floating-anchor-width)] min-w-[12rem] flex-col overflow-y-auto rounded-lg border border-foreground/10 bg-popover p-1 text-popover-foreground shadow-md outline-none"
		>
			{#each filteredOptions as option (option.value)}
				<Combobox.Item
					value={option.value}
					label={option.label}
					class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-primary/10"
				>
					{#if option.icon}
						<CategoryBadge
							icon={option.icon}
							color={option.color ?? '#6B7280'}
							size={24}
							iconSize={13}
						/>
					{/if}
					<span class="min-w-0 flex-1 truncate">{option.label}</span>
					{#if value === option.value}
						<CheckIcon size={14} class="shrink-0" />
					{/if}
				</Combobox.Item>
			{:else}
				<p class="px-2.5 py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
			{/each}
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
