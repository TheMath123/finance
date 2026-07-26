<script lang="ts">
	import { evaluateFormula } from '@finance/formula';
	import CalculatorIcon from 'phosphor-svelte/lib/Calculator';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeft';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRight';

	import { resolve } from '$app/paths';

	import FormulaDialog from '$lib/components/calculator/formula-dialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { buildClientFormulaCatalog } from '$lib/formula-catalog';
	import { MONTH_NAMES } from '$lib/month-names';
	import { formatCents } from '$lib/money';

	let { data } = $props();

	let formulaDialogOpen = $state(false);

	const catalog = $derived(
		data.summary ? buildClientFormulaCatalog(data.summary) : { values: {}, variables: [] }
	);
	const pinnedFormulas = $derived(data.formulas.filter((f) => f.pinnedTo === 'home'));

	const monthLabel = $derived(`${MONTH_NAMES[data.month - 1]} de ${data.year}`);

	const prev = $derived(
		data.month === 1
			? { year: data.year - 1, month: 12 }
			: { year: data.year, month: data.month - 1 }
	);
	const next = $derived(
		data.month === 12
			? { year: data.year + 1, month: 1 }
			: { year: data.year, month: data.month + 1 }
	);

	const maxCategoryTotal = $derived(
		data.summary ? Math.max(1, ...data.summary.byCategory.map((c) => c.total)) : 1
	);
</script>

<svelte:head>
	<title>Início — Finance</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-semibold">Olá, {data.user.name}</h1>
		<nav class="flex items-center gap-1">
			<a
				href="{resolve('/')}?year={prev.year}&month={prev.month}"
				aria-label="Mês anterior"
				class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
			>
				<CaretLeftIcon size={16} />
			</a>
			<span class="min-w-36 text-center text-sm font-medium">{monthLabel}</span>
			<a
				href="{resolve('/')}?year={next.year}&month={next.month}"
				aria-label="Próximo mês"
				class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
			>
				<CaretRightIcon size={16} />
			</a>
		</nav>
	</div>

	{#if !data.summary}
		<p class="text-sm text-muted-foreground">
			{data.activeWorkspace
				? 'Não foi possível carregar o resumo deste mês.'
				: 'Sem workspace ativo.'}
		</p>
	{:else}
		<!-- Stat tiles: um número por card, rótulo em sentence case, sem dois-pontos. -->
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="text-sm text-muted-foreground">Saldo total</p>
				<p class="mt-1 text-2xl font-semibold">{formatCents(data.summary.totalBalance)}</p>
			</div>
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="text-sm text-muted-foreground">Receitas</p>
				<p class="mt-1 text-2xl font-semibold text-success">{formatCents(data.summary.income)}</p>
			</div>
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="text-sm text-muted-foreground">Despesas</p>
				<p class="mt-1 text-2xl font-semibold text-destructive">
					{formatCents(data.summary.expense)}
				</p>
			</div>
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="text-sm text-muted-foreground">Disponível projetado</p>
				<p class="mt-1 text-2xl font-semibold">
					{data.summary.projectedAvailable !== null
						? formatCents(data.summary.projectedAvailable)
						: '—'}
				</p>
			</div>
		</div>

		<div>
			<h2 class="mb-3 text-sm font-medium text-muted-foreground">Despesas por categoria</h2>
			<!-- A barra é decoração dentro da célula de valor — a tabela por si só já é a "table
			     view" acessível, sem precisar de toggle gráfico/tabela separado. -->
			<table class="w-full text-sm">
				<tbody>
					{#each data.summary.byCategory as category (category.categoryId)}
						<tr class="border-b border-foreground/10 last:border-0">
							<td class="w-1/3 py-2 pr-3">
								<span class="inline-flex items-center gap-2">
									<span
										class="h-2.5 w-2.5 shrink-0 rounded-full"
										style="background-color: {category.color}"
									></span>
									<span class="truncate">{category.name}</span>
								</span>
							</td>
							<td class="py-2">
								<div class="h-2.5 bg-transparent">
									<div
										class="h-2.5 rounded-r"
										style="width: {(category.total / maxCategoryTotal) *
											100}%; background-color: {category.color}"
									></div>
								</div>
							</td>
							<td class="py-2 pl-3 text-right font-medium tabular-nums">
								{formatCents(category.total)}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="3" class="py-6 text-center text-muted-foreground">
								Nenhuma despesa neste mês.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div>
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-sm font-medium text-muted-foreground">Fórmulas salvas</h2>
				<Button variant="outline" size="sm" onclick={() => (formulaDialogOpen = true)}>
					<CalculatorIcon size={16} />
					Nova fórmula
				</Button>
			</div>
			{#if pinnedFormulas.length === 0}
				<p class="text-sm text-muted-foreground">Nenhuma fórmula fixada aqui ainda.</p>
			{:else}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{#each pinnedFormulas as formula (formula.id)}
						{@const evaluated = evaluateFormula(formula.expression, catalog.values)}
						<div class="rounded-lg border border-foreground/10 p-4">
							<p class="truncate text-sm text-muted-foreground">{formula.name}</p>
							<p class="mt-1 text-2xl font-semibold">
								{#if evaluated.ok}
									{formula.displayFormat === 'currency'
										? formatCents(evaluated.value)
										: evaluated.value}
								{:else}
									—
								{/if}
							</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<FormulaDialog
	bind:open={formulaDialogOpen}
	variables={catalog.variables}
	values={catalog.values}
	formulas={data.formulas}
/>
