<script lang="ts">
	import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon';

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { resolveCategoryIcon } from '$lib/category-icon';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ComboSelect } from '$lib/components/ui/combo-select';
	import { FileDrop } from '$lib/components/ui/file-drop';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { formatCents } from '$lib/money';
	import type { CsvImportPreviewResult, CsvImportRowStatus } from '$lib/server/invoice-api';
	import { formatTransactionDate } from '$lib/transaction-labels';

	let { data } = $props();

	interface CsvReviewRow {
		rowIndex: number;
		date: string;
		description: string;
		amount: number;
		status: CsvImportRowStatus;
		installmentDetected: { number: number; total: number } | null;
		treatAsInstallment: boolean;
		categoryId: string;
		include: boolean;
	}

	const STATUS_LABELS: Record<CsvImportRowStatus, string> = {
		new: 'Nova',
		duplicate: 'Duplicada',
		invalid: 'Inválida'
	};
	const STATUS_BADGE_CLASS: Record<CsvImportRowStatus, string> = {
		new: 'border-success/30 bg-success/10 text-success',
		duplicate: 'text-muted-foreground',
		invalid: 'border-destructive/30 bg-destructive/10 text-destructive'
	};

	let step = $state<'select' | 'review' | 'done'>('select');
	let csvFile = $state<File | null>(null);
	let csvMonth = $state(`${data.defaultYear}-${String(data.defaultMonth).padStart(2, '0')}`);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let csvPreview = $state<CsvImportPreviewResult | null>(null);
	let reviewRows = $state<CsvReviewRow[]>([]);
	let summary = $state<{
		created: number;
		skippedDuplicates: number;
		skippedPaidInvoice: number;
	} | null>(null);

	const includedCount = $derived(reviewRows.filter((r) => r.status === 'new' && r.include).length);
	const categoryOptions = $derived(
		data.categories.map((category) => ({
			value: category.id,
			label: category.name,
			icon: resolveCategoryIcon(category.icon),
			color: category.color
		}))
	);

	// Busca em memória, sem acento (mesma técnica usada em ui/combo-select) —
	// filtra só a exibição, `includedCount` continua contando a lista inteira.
	let search = $state('');
	const DIACRITICS_PATTERN = /[̀-ͯ]/g;
	function normalize(text: string): string {
		return text.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase();
	}
	const filteredRows = $derived.by(() => {
		const query = normalize(search.trim());
		if (!query) return reviewRows;
		return reviewRows.filter((r) => normalize(r.description).includes(query));
	});

	async function runPreview() {
		if (!csvFile || !csvMonth) return;
		const [year, month] = csvMonth.split('-').map(Number);
		if (!year || !month) return;

		loading = true;
		error = null;
		const formData = new FormData();
		formData.set('file', csvFile);
		formData.set('month', String(month));
		formData.set('year', String(year));

		const response = await fetch(`/more/cards/${data.card.id}/invoices/csv-import/preview`, {
			method: 'POST',
			body: formData
		});
		const payload = await response.json();
		loading = false;

		if (!response.ok) {
			error = payload?.error?.message ?? 'Não foi possível ler o CSV.';
			return;
		}

		csvPreview = payload as CsvImportPreviewResult;
		reviewRows = csvPreview.rows.map((r) => ({
			rowIndex: r.rowIndex,
			date: r.date ?? '',
			description: r.description ?? '(descrição vazia)',
			amount: r.amount ?? 0,
			status: r.status,
			installmentDetected: r.installment,
			treatAsInstallment: r.installment !== null,
			categoryId: r.suggestedCategoryId ?? data.categories[0]?.id ?? '',
			include: r.status === 'new'
		}));
		step = 'review';
	}

	async function runConfirm() {
		if (!csvMonth) return;
		const [year, month] = csvMonth.split('-').map(Number);
		if (!year || !month) return;

		const rows = reviewRows
			.filter((r) => r.status === 'new' && r.include)
			.map((r) => ({
				date: r.date,
				description: r.description,
				amount: r.amount,
				categoryId: r.categoryId,
				installment: r.treatAsInstallment && r.installmentDetected ? r.installmentDetected : null
			}));
		if (rows.length === 0) {
			error = 'Nenhuma linha selecionada pra importar.';
			return;
		}

		loading = true;
		error = null;
		const response = await fetch(`/more/cards/${data.card.id}/invoices/csv-import/confirm`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ month, year, rows })
		});
		const payload = await response.json();
		loading = false;

		if (!response.ok) {
			error = payload?.error?.message ?? 'Não foi possível confirmar a importação.';
			return;
		}

		summary = payload;
		step = 'done';
	}

	function backToInvoices() {
		goto(resolve(`/more/cards/${data.card.id}/invoices`));
	}
</script>

<svelte:head>
	<title>Importar CSV — {data.card.name} — Marcelus</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center gap-3">
		<a
			href={resolve(`/more/cards/${data.card.id}/invoices`)}
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
			aria-label="Voltar para Faturas"
		>
			<ArrowLeftIcon size={18} />
		</a>
		<div>
			<h1 class="text-xl font-semibold">Importar CSV de fatura</h1>
			<p class="text-sm text-muted-foreground">
				Extrato do banco (ou fatura já fechada) pra {data.card.name} — linhas duplicadas são puladas automaticamente
				e nunca sobrescrevem o que já existe.
			</p>
		</div>
	</div>

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}

	{#if step === 'select'}
		<div class="grid max-w-md gap-4">
			<div class="grid gap-2">
				<Label for="csv-month">Mês da fatura</Label>
				<Input id="csv-month" type="month" bind:value={csvMonth} required />
			</div>
			<div class="grid gap-2">
				<Label for="csv-file">Arquivo CSV</Label>
				<FileDrop id="csv-file" accept=".csv,text/csv" bind:file={csvFile} />
				<p class="text-xs text-muted-foreground">
					Precisa ter data, descrição e valor — o formato exato do banco é detectado
					automaticamente.
				</p>
			</div>
			<Button class="w-fit" disabled={!csvFile || !csvMonth || loading} onclick={runPreview}>
				{loading ? 'Analisando…' : 'Analisar CSV'}
			</Button>
		</div>
	{:else if step === 'review' && csvPreview}
		<div class="grid gap-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm text-muted-foreground">
					{includedCount} linha{includedCount === 1 ? '' : 's'} selecionada{includedCount === 1
						? ''
						: 's'} pra importar de {csvPreview.rows.length} lida{csvPreview.rows.length === 1
						? ''
						: 's'}.
					{#if !csvPreview.headerDetected}
						Cabeçalho não reconhecido — colunas assumidas por posição, confira os valores abaixo.
					{/if}
				</p>
				<div class="flex flex-wrap items-center gap-2">
					<Input
						type="search"
						placeholder="Buscar por descrição"
						bind:value={search}
						class="h-8 w-56 text-sm"
					/>
					<!-- Cópia do botão de confirmar lá embaixo — listas longas não obrigam
					     rolar até o fim só pra concluir a importação. -->
					<Button
						type="button"
						size="sm"
						disabled={includedCount === 0 || loading}
						onclick={runConfirm}
					>
						{loading ? 'Importando…' : `Confirmar importação (${includedCount})`}
					</Button>
				</div>
			</div>

			<div class="overflow-x-auto rounded-xl border border-foreground/10">
				<table class="w-full min-w-[760px] text-sm">
					<thead class="sticky top-0 bg-popover text-xs text-muted-foreground">
						<tr class="border-b border-foreground/10">
							<th class="px-3 py-2 text-left font-medium">Incluir</th>
							<th class="px-3 py-2 text-left font-medium">Data</th>
							<th class="px-3 py-2 text-left font-medium">Descrição</th>
							<th class="px-3 py-2 text-left font-medium">Valor</th>
							<th class="px-3 py-2 text-left font-medium">Categoria</th>
							<th class="px-3 py-2 text-left font-medium">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredRows as row (row.rowIndex)}
							<tr class="border-b border-foreground/5 last:border-0">
								<td class="px-3 py-2">
									{#if row.status === 'new'}
										<input
											type="checkbox"
											bind:checked={row.include}
											aria-label="Incluir esta linha na importação"
											class="h-4 w-4"
										/>
									{/if}
								</td>
								<td class="px-3 py-2 whitespace-nowrap tabular-nums">
									{row.date ? formatTransactionDate(row.date) : '—'}
								</td>
								<td class="px-3 py-2">
									{#if row.status === 'new'}
										<Input
											bind:value={row.description}
											disabled={!row.include}
											class="h-8 text-sm"
										/>
										{#if row.installmentDetected}
											<label class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
												<input
													type="checkbox"
													bind:checked={row.treatAsInstallment}
													disabled={!row.include}
												/>
												Parcela {row.installmentDetected.number} de {row.installmentDetected.total} —
												lança as próximas faturas
											</label>
										{/if}
									{:else}
										<span class="text-muted-foreground">{row.description}</span>
									{/if}
								</td>
								<td class="px-3 py-2 text-left whitespace-nowrap tabular-nums">
									{formatCents(row.amount)}
								</td>
								<td class="px-3 py-2">
									{#if row.status === 'new'}
										<ComboSelect
											options={categoryOptions}
											bind:value={row.categoryId}
											disabled={!row.include}
										/>
									{/if}
								</td>
								<td class="px-3 py-2">
									<Badge variant="outline" class={STATUS_BADGE_CLASS[row.status]}>
										{STATUS_LABELS[row.status]}
									</Badge>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-3 py-6 text-center text-sm text-muted-foreground">
									Nenhuma linha encontrada pra "{search}".
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="flex gap-2">
				<Button type="button" variant="outline" onclick={() => (step = 'select')}>Voltar</Button>
				<Button type="button" disabled={includedCount === 0 || loading} onclick={runConfirm}>
					{loading ? 'Importando…' : `Confirmar importação (${includedCount})`}
				</Button>
			</div>
		</div>
	{:else if step === 'done' && summary}
		<div class="grid gap-3">
			<p class="text-sm">
				<span class="font-medium text-success">{summary.created}</span>
				transação{summary.created === 1 ? '' : 'ões'} criada{summary.created === 1 ? '' : 's'}.
			</p>
			{#if summary.skippedDuplicates > 0}
				<p class="text-sm text-muted-foreground">
					{summary.skippedDuplicates} pulada{summary.skippedDuplicates === 1 ? '' : 's'} por já existir
					(duplicata).
				</p>
			{/if}
			{#if summary.skippedPaidInvoice > 0}
				<p class="text-sm text-muted-foreground">
					{summary.skippedPaidInvoice} parcela{summary.skippedPaidInvoice === 1 ? '' : 's'} futura{summary.skippedPaidInvoice ===
					1
						? ''
						: 's'} não lançada{summary.skippedPaidInvoice === 1 ? '' : 's'} — fatura já paga.
				</p>
			{/if}
			<Button type="button" class="w-fit" onclick={backToInvoices}>Voltar para Faturas</Button>
		</div>
	{/if}
</div>
