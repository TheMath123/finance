<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import CalendarBlankIcon from 'phosphor-svelte/lib/CalendarBlank';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeft';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRight';
	import { cn } from '$lib/utils.js';

	/**
	 * Seletor de mês próprio — mesmo motivo do ui/date-picker, mas o bits-ui
	 * não tem um Calendar com granularidade de mês (só dia/hora/minuto/
	 * segundo), então aqui é um popover totalmente nosso (grade de 12 meses +
	 * navegação de ano), pensado pra ter a mesma cara do resto do app. API de
	 * string simples (`YYYY-MM`) — drop-in compatível com todo `bind:value`
	 * que hoje aponta pra um `<input type="month">`. Sem nenhum componente
	 * do bits-ui envolvido além do Popover (já usado em outros lugares do
	 * app) — não foi implicado na quebra de hidratação do date-picker.
	 */
	let {
		value = $bindable(),
		onValueChange,
		id,
		name,
		disabled = false,
		required = false,
		placeholder = 'Selecione o mês',
		class: className
	}: {
		value?: string;
		onValueChange?: (value: string) => void;
		id?: string;
		name?: string;
		disabled?: boolean;
		required?: boolean;
		placeholder?: string;
		class?: string;
	} = $props();

	const MONTH_ABBREVIATIONS = [
		'jan',
		'fev',
		'mar',
		'abr',
		'mai',
		'jun',
		'jul',
		'ago',
		'set',
		'out',
		'nov',
		'dez'
	];
	const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
		month: 'long',
		year: 'numeric'
	});

	function parseValue(raw: string | undefined): { year: number; month: number } | null {
		if (!raw) return null;
		const [y, m] = raw.split('-').map(Number);
		if (!y || !m) return null;
		return { year: y, month: m };
	}

	const selected = $derived(parseValue(value));
	const label = $derived(
		selected ? MONTH_LABEL_FORMATTER.format(new Date(selected.year, selected.month - 1, 1)) : ''
	);

	let open = $state(false);
	// Ano exibido na grade — abre no ano selecionado, ou no atual se vazio;
	// navegar com as setas não afeta `value` até um mês ser de fato clicado.
	let viewYear = $state(selected?.year ?? new Date().getFullYear());

	function handleOpenChange(next: boolean) {
		open = next;
		if (next) viewYear = selected?.year ?? new Date().getFullYear();
	}

	function pick(month: number) {
		const iso = `${viewYear}-${String(month).padStart(2, '0')}`;
		value = iso;
		onValueChange?.(iso);
		open = false;
	}

	function clear() {
		value = '';
		onValueChange?.('');
		open = false;
	}

	function pickCurrentMonth() {
		const now = new Date();
		viewYear = now.getFullYear();
		pick(now.getMonth() + 1);
	}
</script>

{#if name}
	<input type="hidden" {name} value={value ?? ''} {required} />
{/if}

<Popover.Root bind:open onOpenChange={handleOpenChange}>
	<Popover.Trigger
		{id}
		{disabled}
		class={cn(
			'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
	>
		<span class={cn('truncate', selected ? '' : 'text-muted-foreground')}>
			{selected ? label : placeholder}
		</span>
		<CalendarBlankIcon size={16} class="shrink-0 text-muted-foreground" />
	</Popover.Trigger>
	<Popover.Content class="w-64 p-3" align="start">
		<div class="flex items-center justify-between border-b border-foreground/10 pb-2">
			<button
				type="button"
				onclick={() => (viewYear -= 1)}
				aria-label="Ano anterior"
				class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground"
			>
				<CaretLeftIcon size={14} />
			</button>
			<span class="text-sm font-medium">{viewYear}</span>
			<button
				type="button"
				onclick={() => (viewYear += 1)}
				aria-label="Próximo ano"
				class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground"
			>
				<CaretRightIcon size={14} />
			</button>
		</div>
		<div class="mt-2 grid grid-cols-4 gap-1">
			{#each MONTH_ABBREVIATIONS as abbrev, index (abbrev)}
				{@const month = index + 1}
				{@const isSelected = selected?.year === viewYear && selected.month === month}
				<button
					type="button"
					onclick={() => pick(month)}
					class={cn(
						'rounded-md py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
						isSelected
							? 'bg-primary font-medium text-primary-foreground'
							: 'text-foreground hover:bg-foreground/5'
					)}
				>
					{abbrev}
				</button>
			{/each}
		</div>
		<div class="mt-2 flex items-center justify-between border-t border-foreground/10 pt-2 text-sm">
			<button
				type="button"
				onclick={clear}
				class="text-muted-foreground transition-colors outline-none hover:text-foreground"
			>
				Limpar
			</button>
			<button
				type="button"
				onclick={pickCurrentMonth}
				class="text-primary transition-colors outline-none hover:underline"
			>
				Este mês
			</button>
		</div>
	</Popover.Content>
</Popover.Root>
