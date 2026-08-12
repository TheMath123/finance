<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { MONTH_NAMES } from '$lib/month-names';
	import { formatCents } from '$lib/money';
	import type {
		CsvImportPreviewResult,
		CsvImportRowStatus,
		InvoiceView
	} from '$lib/server/invoice-api';

	let { data, form } = $props();

	let paying = $state<InvoiceView | null>(null);

	// --- Import de CSV de fatura (feature-flagged) ---

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

	const CSV_STATUS_LABELS: Record<CsvImportRowStatus, string> = {
		new: 'Nova',
		duplicate: 'Duplicada',
		invalid: 'Inválida'
	};
	const CSV_STATUS_BADGE_CLASS: Record<CsvImportRowStatus, string> = {
		new: 'border-success/30 bg-success/10 text-success',
		duplicate: 'text-muted-foreground',
		invalid: 'border-destructive/30 bg-destructive/10 text-destructive'
	};

	function defaultCsvMonth(): string {
		if (data.monthFilter) return data.monthFilter;
		if (data.current) {
			return `${data.current.yearReference}-${String(data.current.monthReference).padStart(2, '0')}`;
		}
		return new Date().toISOString().slice(0, 7);
	}

	let csvImportOpen = $state(false);
	let csvStep = $state<'select' | 'review' | 'done'>('select');
	let csvFile = $state<File | null>(null);
	let csvMonth = $state(defaultCsvMonth());
	let csvLoading = $state(false);
	let csvError = $state<string | null>(null);
	let csvPreview = $state<CsvImportPreviewResult | null>(null);
	let reviewRows = $state<CsvReviewRow[]>([]);
	let csvSummary = $state<{
		created: number;
		skippedDuplicates: number;
		skippedPaidInvoice: number;
	} | null>(null);

	const includedCount = $derived(reviewRows.filter((r) => r.status === 'new' && r.include).length);

	function openCsvImport() {
		csvStep = 'select';
		csvFile = null;
		csvMonth = defaultCsvMonth();
		csvError = null;
		csvPreview = null;
		reviewRows = [];
		csvSummary = null;
		csvLoading = false;
		csvImportOpen = true;
	}

	async function runCsvPreview() {
		if (!csvFile || !csvMonth) return;
		const [year, month] = csvMonth.split('-').map(Number);
		if (!year || !month) return;

		csvLoading = true;
		csvError = null;
		const formData = new FormData();
		formData.set('file', csvFile);
		formData.set('month', String(month));
		formData.set('year', String(year));

		const response = await fetch('csv-import/preview', { method: 'POST', body: formData });
		const payload = await response.json();
		csvLoading = false;

		if (!response.ok) {
			csvError = payload?.error?.message ?? 'Não foi possível ler o CSV.';
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
		csvStep = 'review';
	}

	async function runCsvConfirm() {
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
			csvError = 'Nenhuma linha selecionada pra importar.';
			return;
		}

		csvLoading = true;
		csvError = null;
		const response = await fetch('csv-import/confirm', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ month, year, rows })
		});
		const payload = await response.json();
		csvLoading = false;

		if (!response.ok) {
			csvError = payload?.error?.message ?? 'Não foi possível confirmar a importação.';
			return;
		}

		csvSummary = payload;
		csvStep = 'done';
	}

	async function finishCsvImport() {
		csvImportOpen = false;
		await invalidateAll();
	}

	const STATUS_LABELS: Record<string, string> = {
		open: 'Aberta',
		closed: 'Fechada',
		paid: 'Paga'
	};

	/** Classes extras aplicadas sobre `variant="outline"` — reaproveita o tom `/10` já usado pela variante destructive do Badge, só trocando o token de cor. */
	const STATUS_BADGE_CLASS: Record<string, string> = {
		open: 'text-muted-foreground',
		closed: 'border-foreground/20 text-foreground',
		paid: 'border-success/30 bg-success/10 text-success'
	};

	function todayIso(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function closeOnSuccess(close: () => void) {
		return async ({
			result,
			update
		}: {
			result: { type: string };
			update: () => Promise<void>;
		}) => {
			if (result.type === 'success') close();
			await update();
		};
	}

	// A fatura em destaque já vem separada do backend — evita mostrá-la de novo
	// na lista de histórico quando ela cair na página/filtro atual.
	const historyInvoices = $derived(data.invoices.filter((i) => i.id !== data.current?.id));
	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
</script>

<svelte:head>
	<title>Faturas — {data.card.name} — Marcelus</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<div>
		<a
			href={resolve('/more/cards')}
			class="text-sm text-muted-foreground underline-offset-4 hover:underline"
		>
			← Cartões
		</a>
		<h1 class="text-xl font-semibold">Faturas — {data.card.name}</h1>
	</div>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	{#if data.current}
		<div class="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-5">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-sm text-muted-foreground">
						{MONTH_NAMES[data.current.monthReference - 1]} de {data.current.yearReference}
					</p>
					<p class="mt-1 text-3xl font-semibold tabular-nums">
						{formatCents(data.current.total)}
					</p>
				</div>
				<Badge variant="outline" class={STATUS_BADGE_CLASS[data.current.effectiveStatus]}>
					{STATUS_LABELS[data.current.effectiveStatus] ?? data.current.effectiveStatus}
				</Badge>
			</div>
			{#if data.current.total > 0}
				<Button class="mt-4" onclick={() => (paying = data.current)}>Pagar fatura</Button>
			{/if}
		</div>
	{:else if data.invoices.length === 0 && !data.monthFilter}
		<p class="py-6 text-center text-sm text-muted-foreground">Nenhuma fatura ainda.</p>
	{:else}
		<p class="text-sm text-muted-foreground">Nenhuma fatura pendente — tudo em dia.</p>
	{/if}

	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="text-sm font-medium text-muted-foreground">Histórico</h2>
			<div class="flex flex-wrap items-center gap-2">
				{#if data.csvImportEnabled}
					<Button type="button" variant="outline" size="sm" onclick={openCsvImport}>
						Importar CSV
					</Button>
				{/if}
				<form method="GET" class="flex items-center gap-2">
					<Input
						type="month"
						name="month"
						value={data.monthFilter}
						class="h-8 w-40"
						aria-label="Filtrar por mês"
					/>
					<Button type="submit" variant="outline" size="sm">Filtrar</Button>
					{#if data.monthFilter}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={() => {
								// "?" (mesma rota, sem query) não é um caminho fixo que resolve() aceite.
								// eslint-disable-next-line svelte/no-navigation-without-resolve
								goto('?');
							}}
						>
							Limpar
						</Button>
					{/if}
				</form>
			</div>
		</div>

		<div>
			{#each historyInvoices as invoice (invoice.id)}
				<div
					class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4"
				>
					<div class="flex min-w-0 items-center gap-3">
						<p class="text-sm font-medium">
							{MONTH_NAMES[invoice.monthReference - 1]} de {invoice.yearReference}
						</p>
						<Badge variant="outline" class={STATUS_BADGE_CLASS[invoice.effectiveStatus]}>
							{STATUS_LABELS[invoice.effectiveStatus] ?? invoice.effectiveStatus}
						</Badge>
					</div>
					<div class="flex shrink-0 items-center gap-3">
						<span class="text-sm font-medium tabular-nums">{formatCents(invoice.total)}</span>
						{#if invoice.effectiveStatus !== 'paid' && invoice.total > 0}
							<Button variant="outline" size="sm" onclick={() => (paying = invoice)}>Pagar</Button>
						{/if}
					</div>
				</div>
			{:else}
				<p class="py-6 text-center text-sm text-muted-foreground">
					{data.monthFilter
						? 'Nenhuma fatura encontrada nesse mês.'
						: 'Nenhuma fatura no histórico ainda.'}
				</p>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-2 pt-2">
				<form method="GET">
					<input type="hidden" name="month" value={data.monthFilter} />
					<input type="hidden" name="page" value={data.page - 1} />
					<Button type="submit" variant="outline" size="sm" disabled={data.page <= 1}>
						Anterior
					</Button>
				</form>
				<span class="text-sm text-muted-foreground">Página {data.page} de {totalPages}</span>
				<form method="GET">
					<input type="hidden" name="month" value={data.monthFilter} />
					<input type="hidden" name="page" value={data.page + 1} />
					<Button type="submit" variant="outline" size="sm" disabled={data.page >= totalPages}>
						Próxima
					</Button>
				</form>
			</div>
		{/if}
	</div>
</div>

<Dialog.Root open={paying !== null} onOpenChange={(open) => !open && (paying = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Pagar fatura</Dialog.Title>
			{#if paying}
				<Dialog.Description>
					{MONTH_NAMES[paying.monthReference - 1]} de {paying.yearReference} — {formatCents(
						paying.total
					)}
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		{#if paying}
			<form
				method="POST"
				action="?/pay"
				class="grid gap-4"
				use:enhance={() => closeOnSuccess(() => (paying = null))}
			>
				<input type="hidden" name="invoiceId" value={paying.id} />
				<div class="grid gap-2">
					<Label for="pay-account">Conta</Label>
					<select
						id="pay-account"
						name="accountId"
						required
						class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{#each data.accounts as account (account.id)}
							<option value={account.id}>{account.name}</option>
						{/each}
					</select>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label for="pay-date">Data</Label>
						<Input id="pay-date" name="date" type="date" value={todayIso()} required />
					</div>
					<div class="grid gap-2">
						<Label for="pay-method">Método</Label>
						<select
							id="pay-method"
							name="method"
							class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<option value="pix">Pix</option>
							<option value="debit">Débito</option>
						</select>
					</div>
				</div>
				<Dialog.Footer>
					<Button type="submit">Confirmar pagamento</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root
	open={csvImportOpen}
	onOpenChange={(open) => {
		if (!open) csvImportOpen = false;
	}}
>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Importar CSV de fatura</Dialog.Title>
			<Dialog.Description>
				Extrato do banco (ou fatura já fechada) pra {data.card.name} — linhas duplicadas são puladas automaticamente
				e nunca sobrescrevem o que já existe.
			</Dialog.Description>
		</Dialog.Header>

		{#if csvError}
			<p class="text-sm text-destructive">{csvError}</p>
		{/if}

		{#if csvStep === 'select'}
			<div class="grid gap-4">
				<div class="grid gap-2">
					<Label for="csv-month">Mês da fatura</Label>
					<Input id="csv-month" type="month" bind:value={csvMonth} required />
				</div>
				<div class="grid gap-2">
					<Label for="csv-file">Arquivo CSV</Label>
					<input
						id="csv-file"
						type="file"
						accept=".csv,text/csv"
						class="h-9 w-full rounded-lg border border-foreground/10 bg-transparent text-sm outline-none file:mr-3 file:h-full file:cursor-pointer file:border-0 file:bg-foreground/5 file:px-3 file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-ring"
						onchange={(e) => (csvFile = e.currentTarget.files?.[0] ?? null)}
					/>
					<p class="text-xs text-muted-foreground">
						Precisa ter data, descrição e valor — o formato exato do banco é detectado
						automaticamente.
					</p>
				</div>
				<Dialog.Footer>
					<Button
						type="button"
						disabled={!csvFile || !csvMonth || csvLoading}
						onclick={runCsvPreview}
					>
						{csvLoading ? 'Analisando…' : 'Analisar CSV'}
					</Button>
				</Dialog.Footer>
			</div>
		{:else if csvStep === 'review' && csvPreview}
			<div class="grid gap-3">
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

				<div class="max-h-96 overflow-y-auto rounded-xl border border-foreground/10">
					<table class="w-full text-sm">
						<thead class="sticky top-0 bg-popover text-xs text-muted-foreground">
							<tr class="border-b border-foreground/10">
								<th class="px-3 py-2 text-left font-medium">Incluir</th>
								<th class="px-3 py-2 text-left font-medium">Data</th>
								<th class="px-3 py-2 text-left font-medium">Descrição</th>
								<th class="px-3 py-2 text-right font-medium">Valor</th>
								<th class="px-3 py-2 text-left font-medium">Categoria</th>
								<th class="px-3 py-2 text-left font-medium">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each reviewRows as row (row.rowIndex)}
								<tr class="border-b border-foreground/5 last:border-0">
									<td class="px-3 py-2">
										{#if row.status === 'new'}
											<Switch size="sm" bind:checked={row.include} />
										{/if}
									</td>
									<td class="px-3 py-2 whitespace-nowrap tabular-nums">{row.date || '—'}</td>
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
													Parcela {row.installmentDetected.number} de {row.installmentDetected
														.total} — lança as próximas faturas
												</label>
											{/if}
										{:else}
											<span class="text-muted-foreground">{row.description}</span>
										{/if}
									</td>
									<td class="px-3 py-2 text-right whitespace-nowrap tabular-nums">
										{formatCents(row.amount)}
									</td>
									<td class="px-3 py-2">
										{#if row.status === 'new'}
											<select
												bind:value={row.categoryId}
												disabled={!row.include}
												class="h-8 w-full rounded-lg border border-foreground/10 bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												{#each data.categories as category (category.id)}
													<option value={category.id}>{category.name}</option>
												{/each}
											</select>
										{/if}
									</td>
									<td class="px-3 py-2">
										<Badge variant="outline" class={CSV_STATUS_BADGE_CLASS[row.status]}>
											{CSV_STATUS_LABELS[row.status]}
										</Badge>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={() => (csvStep = 'select')}>
						Voltar
					</Button>
					<Button
						type="button"
						disabled={includedCount === 0 || csvLoading}
						onclick={runCsvConfirm}
					>
						{csvLoading ? 'Importando…' : `Confirmar importação (${includedCount})`}
					</Button>
				</Dialog.Footer>
			</div>
		{:else if csvStep === 'done' && csvSummary}
			<div class="grid gap-3">
				<p class="text-sm">
					<span class="font-medium text-success">{csvSummary.created}</span>
					transação{csvSummary.created === 1 ? '' : 'ões'} criada{csvSummary.created === 1
						? ''
						: 's'}.
				</p>
				{#if csvSummary.skippedDuplicates > 0}
					<p class="text-sm text-muted-foreground">
						{csvSummary.skippedDuplicates} pulada{csvSummary.skippedDuplicates === 1 ? '' : 's'} por já
						existir (duplicata).
					</p>
				{/if}
				{#if csvSummary.skippedPaidInvoice > 0}
					<p class="text-sm text-muted-foreground">
						{csvSummary.skippedPaidInvoice} parcela{csvSummary.skippedPaidInvoice === 1 ? '' : 's'} futura{csvSummary.skippedPaidInvoice ===
						1
							? ''
							: 's'} não lançada{csvSummary.skippedPaidInvoice === 1 ? '' : 's'} — fatura já paga.
					</p>
				{/if}
				<Dialog.Footer>
					<Button type="button" onclick={finishCsvImport}>Fechar</Button>
				</Dialog.Footer>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
