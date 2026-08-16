<script lang="ts">
	import { evaluateFormula } from '@finance/formula';
	import CalculatorIcon from 'phosphor-svelte/lib/Calculator';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeft';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRight';
	import TargetIcon from 'phosphor-svelte/lib/Target';
	import TrendDownIcon from 'phosphor-svelte/lib/TrendDown';
	import TrendUpIcon from 'phosphor-svelte/lib/TrendUp';
	import WalletIcon from 'phosphor-svelte/lib/Wallet';
	import { dndzone } from 'svelte-dnd-action';
	import { fade } from 'svelte/transition';

	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	import FormulaDialog from '$lib/components/calculator/formula-dialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { buildClientFormulaCatalog } from '$lib/formula-catalog';
	import { MONTH_NAMES } from '$lib/month-names';
	import { formatCents, formatReais } from '$lib/money';
	import type { SavedFormulaView } from '$lib/server/formula-api';

	let { data, form } = $props();

	let formulaDialogOpen = $state(false);

	const catalog = $derived(
		data.summary
			? buildClientFormulaCatalog(data.summary, data.accounts, data.cards)
			: { values: {}, variables: [] }
	);

	/**
	 * `$derived` gravável (Svelte 5) — o `dndzone` reatribui esse array
	 * localmente durante o arraste (`consider`), antes de persistir de
	 * verdade no `finalize`; reatribuir só "sobrescreve" até `data.formulas`
	 * mudar de novo (ex.: após o `invalidateAll()` do finalize).
	 */
	let pinnedFormulas = $derived(
		data.formulas
			.filter((f) => f.pinnedHome)
			.sort((a, b) => (a.homeOrder ?? Infinity) - (b.homeOrder ?? Infinity))
	);

	function handleConsider(event: CustomEvent<{ items: SavedFormulaView[] }>) {
		pinnedFormulas = event.detail.items;
	}
	async function handleFinalize(event: CustomEvent<{ items: SavedFormulaView[] }>) {
		pinnedFormulas = event.detail.items;
		await fetch('?/reorderFormulas', {
			method: 'POST',
			body: new URLSearchParams({
				field: 'home',
				formulaIds: JSON.stringify(pinnedFormulas.map((f) => f.id))
			})
		});
		await invalidateAll();
	}

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

	/** "Despesas por categoria" (mês corrente, real) e "Gasto variável" (média
	 *  de 3 meses, estimativa — ex-Mais > Gasto variável) mesclados numa aba
	 *  só: mesmo shape de linha, mesma tabela, só troca a fonte de dado.
	 *  A estimativa é literalmente o número que já compõe "Disponível
	 *  projetado" acima — faz mais sentido explicado aqui do lado do que
	 *  isolado numa aba própria. */
	interface CategoryRow {
		categoryId: string;
		name: string;
		color: string;
		amount: number;
	}
	let categoryView = $state<'actual' | 'estimate'>('actual');
	const actualRows = $derived<CategoryRow[]>(
		data.summary
			? data.summary.byCategory.map((c) => ({
					categoryId: c.categoryId,
					name: c.name,
					color: c.color,
					amount: c.total
				}))
			: []
	);
	const estimateRows = $derived<CategoryRow[]>(
		[...data.variableExpense.byCategory]
			.sort((a, b) => b.estimated - a.estimated)
			.map((c) => ({ categoryId: c.categoryId, name: c.name, color: c.color, amount: c.estimated }))
	);
	const categoryRows = $derived(categoryView === 'actual' ? actualRows : estimateRows);
	const maxCategoryTotal = $derived(Math.max(1, ...categoryRows.map((c) => c.amount)));
	const categoryRowsTotal = $derived(categoryRows.reduce((sum, c) => sum + c.amount, 0) || 1);
</script>

<svelte:head>
	<title>Início — Marcelus</title>
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
		<!-- Stat tiles: um número por card, rótulo em sentence case, sem dois-pontos,
		     ícone pequeno reforçando o tipo de número sem competir com ele. -->
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
					<WalletIcon size={15} />
					Saldo total
				</p>
				<p class="mt-1 text-2xl font-semibold">{formatCents(data.summary.totalBalance)}</p>
			</div>
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
					<TrendUpIcon size={15} />
					Receitas
				</p>
				<p class="mt-1 text-2xl font-semibold text-success">{formatCents(data.summary.income)}</p>
			</div>
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
					<TrendDownIcon size={15} />
					Despesas
				</p>
				<p class="mt-1 text-2xl font-semibold text-destructive">
					{formatCents(data.summary.expense)}
				</p>
			</div>
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
					<TargetIcon size={15} />
					Disponível projetado
				</p>
				<p class="mt-1 text-2xl font-semibold">
					{data.summary.projectedAvailable !== null
						? formatCents(data.summary.projectedAvailable)
						: '—'}
				</p>
			</div>
		</div>

		<div>
			<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-sm font-medium text-muted-foreground">Despesas por categoria</h2>
				<!-- Mesclado com o que era Mais > Gasto variável: mesma tabela, só troca a
				     fonte — real (mês corrente) ou média/estimativa (últimos 3 meses, a
				     mesma conta usada em "Disponível projetado" acima). -->
				<div class="inline-flex rounded-lg border border-foreground/10 p-0.5 text-xs">
					<button
						type="button"
						onclick={() => (categoryView = 'actual')}
						class="rounded-md px-2.5 py-1 font-medium transition-colors {categoryView === 'actual'
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Este mês
					</button>
					<button
						type="button"
						onclick={() => (categoryView = 'estimate')}
						class="rounded-md px-2.5 py-1 font-medium transition-colors {categoryView === 'estimate'
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Média (3 meses)
					</button>
				</div>
			</div>
			{#if categoryView === 'estimate'}
				<p class="mb-3 text-xs text-muted-foreground">
					Média dos últimos 3 meses — só o que não é recorrência nem parcela. É a mesma estimativa
					usada em "Disponível projetado" (
					<span class="font-medium text-foreground">{formatCents(data.variableExpense.total)}</span>
					por mês).
				</p>
			{/if}
			<!-- A barra é decoração dentro da célula de valor — a tabela por si só já é a "table
			     view" acessível, sem precisar de toggle gráfico/tabela separado. Crossfade de
			     150ms ao trocar de aba — único "authored moment" de motion desta seção. -->
			{#key categoryView}
				<table class="w-full text-sm" in:fade={{ duration: 150 }}>
					<tbody>
						{#each categoryRows as category (category.categoryId)}
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
											style="width: {(category.amount / maxCategoryTotal) *
												100}%; background-color: {category.color}"
										></div>
									</div>
								</td>
								<td class="py-2 pr-1 pl-3 text-right font-medium tabular-nums">
									{formatCents(category.amount)}
								</td>
								<td class="w-10 py-2 text-right text-xs text-muted-foreground tabular-nums">
									{Math.round((category.amount / categoryRowsTotal) * 100)}%
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="py-6 text-center text-muted-foreground">
									{categoryView === 'actual'
										? 'Nenhuma despesa neste mês.'
										: 'Sem histórico suficiente ainda — a estimativa aparece depois de alguns meses de uso.'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/key}
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
				<!-- Arrastável (svelte-dnd-action) — solta reordena de verdade via action `reorderFormulas`. -->
				<div
					class="grid grid-cols-2 gap-3 sm:grid-cols-4"
					use:dndzone={{ items: pinnedFormulas, flipDurationMs: 150 }}
					onconsider={handleConsider}
					onfinalize={handleFinalize}
				>
					{#each pinnedFormulas as formula (formula.id)}
						{@const evaluated = evaluateFormula(formula.expression, catalog.values)}
						<div
							class="cursor-grab rounded-lg border border-foreground/10 p-4 active:cursor-grabbing"
						>
							<p class="truncate text-sm text-muted-foreground">{formula.name}</p>
							<p class="mt-1 text-2xl font-semibold">
								{#if evaluated.ok}
									{formula.displayFormat === 'currency'
										? formatReais(evaluated.value)
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
	{form}
/>
