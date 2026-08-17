<script lang="ts">
	import { Calendar } from 'bits-ui';
	import { type DateValue, getLocalTimeZone, parseDate, today } from '@internationalized/date';
	import CalendarBlankIcon from 'phosphor-svelte/lib/CalendarBlank';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeft';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRight';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils.js';

	/**
	 * Date picker próprio — mesmo motivo do ui/select: o `<input type="date">`
	 * nativo abre o popup do próprio SO/navegador em vez de um popover
	 * consistente com o resto do app. Mesma estrutura do ui/month-picker
	 * (Popover + grade própria) em vez do composto `DatePicker` do bits-ui
	 * (DateField com segmentos editáveis) — a primeira versão disso usava o
	 * DateField e travou a hidratação da página inteira (nav/sidebar
	 * somem), então esta reconstrução usa só o `Calendar` (grade de dias)
	 * dentro do nosso Popover já testado, com `$state` guardado por
	 * comparação de valor em vez de um `$derived` alimentando prop bindable
	 * de terceiro — evita qualquer ping-pong reativo na sincronização.
	 * API de string simples (`YYYY-MM-DD`), sem digitação por segmento
	 * (clique no calendário; "Hoje"/"Limpar" cobrem os atalhos mais comuns).
	 */
	let {
		value = $bindable(),
		onValueChange,
		id,
		name,
		disabled = false,
		required = false,
		placeholder = 'Selecione a data',
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

	function parseIso(raw: string | undefined): DateValue | undefined {
		if (!raw) return undefined;
		try {
			return parseDate(raw);
		} catch {
			return undefined;
		}
	}

	// `$state` real (não `$derived`) — um `$derived` recria um objeto
	// `DateValue` novo a cada recomputação (mesmo pra data idêntica), e
	// alimentar isso numa prop bindable de terceiro pode gerar sincronização
	// em círculo. Aqui só troca quando o `value` (string) de fora muda de
	// verdade (comparado por conteúdo via `.toString()`), nunca por conta da
	// própria escolha no calendário (que já escreve o mesmo objeto de volta).
	let internalDate = $state<DateValue | undefined>(parseIso(value));
	$effect(() => {
		const next = parseIso(value);
		if (next?.toString() !== internalDate?.toString()) {
			internalDate = next;
		}
	});

	// Monta a string dd/mm/aaaa direto dos campos numéricos do CalendarDate —
	// nunca passa por `Date`/`Intl.DateTimeFormat` aqui, que dependem do fuso
	// horário do ambiente (servidor vs. navegador do usuário) e podiam gerar
	// um dia diferente entre SSR e hidratação.
	const label = $derived(
		internalDate
			? `${String(internalDate.day).padStart(2, '0')}/${String(internalDate.month).padStart(2, '0')}/${internalDate.year}`
			: ''
	);

	let open = $state(false);

	function commit(next: DateValue | undefined) {
		internalDate = next;
		const iso = next ? next.toString() : '';
		if (iso !== (value ?? '')) {
			value = iso;
			onValueChange?.(iso);
		}
	}

	function handleCalendarChange(next: DateValue | undefined) {
		commit(next);
		open = false;
	}

	function pickToday() {
		handleCalendarChange(today(getLocalTimeZone()));
	}

	function clear() {
		handleCalendarChange(undefined);
	}
</script>

{#if name}
	<input type="hidden" {name} value={value ?? ''} {required} />
{/if}

<Popover.Root bind:open>
	<Popover.Trigger
		{id}
		{disabled}
		class={cn(
			'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
	>
		<span class={cn('truncate', internalDate ? '' : 'text-muted-foreground')}>
			{internalDate ? label : placeholder}
		</span>
		<CalendarBlankIcon size={16} class="shrink-0 text-muted-foreground" />
	</Popover.Trigger>
	<Popover.Content class="w-auto p-3" align="start">
		<Calendar.Root
			type="single"
			value={internalDate}
			onValueChange={handleCalendarChange}
			locale="pt-BR"
			weekdayFormat="short"
			fixedWeeks
		>
			{#snippet children({ months, weekdays })}
				<Calendar.Header class="flex items-center justify-between pb-2">
					<Calendar.PrevButton
						class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
					>
						<CaretLeftIcon size={14} />
					</Calendar.PrevButton>
					<Calendar.Heading class="text-sm font-medium" />
					<Calendar.NextButton
						class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
					>
						<CaretRightIcon size={14} />
					</Calendar.NextButton>
				</Calendar.Header>
				{#each months as month (month.value.toString())}
					<Calendar.Grid class="w-full border-collapse select-none">
						<Calendar.GridHead>
							<Calendar.GridRow class="flex justify-between">
								{#each weekdays as day (day)}
									<Calendar.HeadCell
										class="w-8 pb-1 text-center text-xs font-normal text-muted-foreground"
									>
										{day.slice(0, 2)}
									</Calendar.HeadCell>
								{/each}
							</Calendar.GridRow>
						</Calendar.GridHead>
						<Calendar.GridBody>
							{#each month.weeks as weekDates (weekDates[0]?.toString() ?? '')}
								<Calendar.GridRow class="mt-1 flex w-full justify-between">
									{#each weekDates as date (date.toString())}
										<Calendar.Cell {date} month={month.value} class="p-0 text-center text-sm">
											<Calendar.Day
												class="flex h-8 w-8 items-center justify-center rounded-md tabular-nums transition-colors outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring data-outside-month:text-muted-foreground/30 data-selected:bg-primary data-selected:font-medium data-selected:text-primary-foreground data-selected:hover:bg-primary/90 data-today:font-semibold data-unavailable:pointer-events-none data-unavailable:text-muted-foreground/30 data-unavailable:line-through data-disabled:pointer-events-none data-disabled:text-muted-foreground/30"
											/>
										</Calendar.Cell>
									{/each}
								</Calendar.GridRow>
							{/each}
						</Calendar.GridBody>
					</Calendar.Grid>
				{/each}
			{/snippet}
		</Calendar.Root>
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
				onclick={pickToday}
				class="text-primary transition-colors outline-none hover:underline"
			>
				Hoje
			</button>
		</div>
	</Popover.Content>
</Popover.Root>
