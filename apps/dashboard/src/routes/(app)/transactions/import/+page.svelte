<script lang="ts">
	import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon';

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { resolveCategoryIcon } from '$lib/category-icon';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ComboSelect } from '$lib/components/ui/combo-select';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { formatCents } from '$lib/money';
	import type {
		AccountCsvImportPreviewResult,
		AccountCsvImportRowStatus
	} from '$lib/server/account-api';
	import type { CsvImportPreviewResult, CsvImportRowStatus } from '$lib/server/invoice-api';

	let { data } = $props();

	const activeCards = $derived(data.cards.filter((c) => !c.archivedAt));
	const activeAccounts = $derived(data.accounts.filter((a) => !a.archivedAt));
	const showChoice = $derived(data.cardCsvImportEnabled && data.accountCsvImportEnabled);

	const activeCardOptions = $derived(
		activeCards.map((card) => ({ value: card.id, label: card.name }))
	);
	const activeAccountOptions = $derived(
		activeAccounts.map((account) => ({ value: account.id, label: account.name }))
	);
	const METHOD_OPTIONS = [
		{ value: 'pix', label: 'Pix' },
		{ value: 'debit', label: 'Débito' },
		{ value: 'cash', label: 'Dinheiro' }
	];
	const categoryOptions = $derived(
		data.categories.map((category) => ({
			value: category.id,
			label: category.name,
			icon: resolveCategoryIcon(category.icon),
			color: category.color
		}))
	);

	type Step =
		'choose' | 'card-select' | 'card-review' | 'account-select' | 'account-review' | 'done';
	let step = $state<Step>(
		showChoice ? 'choose' : data.cardCsvImportEnabled ? 'card-select' : 'account-select'
	);
	let kind = $state<'card' | 'account' | null>(
		showChoice ? null : data.cardCsvImportEnabled ? 'card' : 'account'
	);

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

	interface CardCsvReviewRow {
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
	interface AccountCsvReviewRow {
		rowIndex: number;
		date: string;
		description: string;
		amount: number;
		status: AccountCsvImportRowStatus;
		categoryId: string;
		include: boolean;
	}

	let selectedCardId = $state(activeCards[0]?.id ?? '');
	let csvMonth = $state('');
	let csvFile = $state<File | null>(null);
	let cardReviewRows = $state<CardCsvReviewRow[]>([]);

	let selectedAccountId = $state(activeAccounts[0]?.id ?? '');
	let selectedMethod = $state<'pix' | 'debit' | 'cash'>('pix');
	let accountFile = $state<File | null>(null);
	let accountReviewRows = $state<AccountCsvReviewRow[]>([]);

	let headerDetected = $state(true);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let summary = $state<{
		created: number;
		skippedDuplicates: number;
		skippedPaidInvoice?: number;
	} | null>(null);

	const includedCount = $derived(
		kind === 'account'
			? accountReviewRows.filter((r) => r.status === 'new' && r.include).length
			: cardReviewRows.filter((r) => r.status === 'new' && r.include).length
	);

	/** Mirror de `competencePeriod` (backend, domain/services/invoice-rules.ts) — fatura em aberto do cartão escolhido hoje. */
	function competencePeriodLocal(
		dateIso: string,
		closingDay: number
	): { month: number; year: number } {
		const [y, m, d] = dateIso.split('-').map(Number) as [number, number, number];
		if (d <= closingDay) return { month: m, year: y };
		return m === 12 ? { month: 1, year: y + 1 } : { month: m + 1, year: y };
	}
	function defaultCardMonth(): string {
		const card = activeCards.find((c) => c.id === selectedCardId);
		if (!card) return new Date().toISOString().slice(0, 7);
		const today = new Date().toISOString().slice(0, 10);
		const period = competencePeriodLocal(today, card.closingDay);
		return `${period.year}-${String(period.month).padStart(2, '0')}`;
	}

	$effect(() => {
		if (kind === 'card' && selectedCardId) csvMonth = defaultCardMonth();
	});

	function chooseCard() {
		kind = 'card';
		step = 'card-select';
	}
	function chooseAccount() {
		kind = 'account';
		step = 'account-select';
	}

	async function runCardPreview() {
		if (!csvFile || !csvMonth || !selectedCardId) return;
		const [year, month] = csvMonth.split('-').map(Number);
		if (!year || !month) return;

		loading = true;
		error = null;
		const formData = new FormData();
		formData.set('file', csvFile);
		formData.set('cardId', selectedCardId);
		formData.set('month', String(month));
		formData.set('year', String(year));

		const response = await fetch('/transactions/csv-import/card/preview', {
			method: 'POST',
			body: formData
		});
		const payload = await response.json();
		loading = false;

		if (!response.ok) {
			error = payload?.error?.message ?? 'Não foi possível ler o CSV.';
			return;
		}

		const preview = payload as CsvImportPreviewResult;
		headerDetected = preview.headerDetected;
		cardReviewRows = preview.rows.map((r) => ({
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
		step = 'card-review';
	}

	async function runCardConfirm() {
		if (!csvMonth || !selectedCardId) return;
		const [year, month] = csvMonth.split('-').map(Number);
		if (!year || !month) return;

		const rows = cardReviewRows
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
		const response = await fetch('/transactions/csv-import/card/confirm', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ cardId: selectedCardId, month, year, rows })
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

	async function runAccountPreview() {
		if (!accountFile || !selectedAccountId) return;

		loading = true;
		error = null;
		const formData = new FormData();
		formData.set('file', accountFile);
		formData.set('accountId', selectedAccountId);

		const response = await fetch('/transactions/csv-import/account/preview', {
			method: 'POST',
			body: formData
		});
		const payload = await response.json();
		loading = false;

		if (!response.ok) {
			error = payload?.error?.message ?? 'Não foi possível ler o CSV.';
			return;
		}

		const preview = payload as AccountCsvImportPreviewResult;
		headerDetected = preview.headerDetected;
		accountReviewRows = preview.rows.map((r) => ({
			rowIndex: r.rowIndex,
			date: r.date ?? '',
			description: r.description ?? '(descrição vazia)',
			amount: r.amount ?? 0,
			status: r.status,
			categoryId: r.suggestedCategoryId ?? data.categories[0]?.id ?? '',
			include: r.status === 'new'
		}));
		step = 'account-review';
	}

	async function runAccountConfirm() {
		if (!selectedAccountId) return;

		const rows = accountReviewRows
			.filter((r) => r.status === 'new' && r.include)
			.map((r) => ({
				date: r.date,
				description: r.description,
				amount: r.amount,
				categoryId: r.categoryId
			}));
		if (rows.length === 0) {
			error = 'Nenhuma linha selecionada pra importar.';
			return;
		}

		loading = true;
		error = null;
		const response = await fetch('/transactions/csv-import/account/confirm', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ accountId: selectedAccountId, method: selectedMethod, rows })
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

	function backToTransactions() {
		goto(resolve('/transactions'));
	}
</script>

<svelte:head>
	<title>Importar CSV — Marcelus</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<div class="flex items-center gap-3">
		<a
			href={resolve('/transactions')}
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
			aria-label="Voltar para Transações"
		>
			<ArrowLeftIcon size={18} />
		</a>
		<div>
			<h1 class="text-xl font-semibold">Importar CSV</h1>
			<p class="text-sm text-muted-foreground">
				{#if step === 'choose'}
					Escolha se o arquivo é uma fatura/extrato de cartão ou um extrato de conta.
				{:else if kind === 'card'}
					Extrato do banco (ou fatura já fechada) — linhas duplicadas são puladas automaticamente e
					nunca sobrescrevem o que já existe.
				{:else}
					Extrato de conta — sem parcela, sem fatura. Linhas duplicadas são puladas automaticamente.
				{/if}
			</p>
		</div>
	</div>

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}

	{#if step === 'choose'}
		<div class="grid gap-3">
			<button
				type="button"
				class="rounded-lg border border-foreground/10 p-4 text-left transition-colors hover:bg-muted"
				onclick={chooseCard}
			>
				<p class="font-medium">Fatura de cartão</p>
				<p class="text-sm text-muted-foreground">
					Cartão específico, mês da fatura e detecção de parcela.
				</p>
			</button>
			<button
				type="button"
				class="rounded-lg border border-foreground/10 p-4 text-left transition-colors hover:bg-muted"
				onclick={chooseAccount}
			>
				<p class="font-medium">Transações de conta</p>
				<p class="text-sm text-muted-foreground">
					Direto pra uma conta bancária (extrato), sem fatura.
				</p>
			</button>
		</div>
	{:else if step === 'card-select'}
		<div class="grid gap-4">
			{#if showChoice}
				<button
					type="button"
					class="w-fit text-sm text-muted-foreground hover:text-foreground"
					onclick={() => (step = 'choose')}
				>
					← Voltar
				</button>
			{/if}
			<div class="grid gap-2">
				<Label for="csv-card">Cartão</Label>
				<Select id="csv-card" options={activeCardOptions} bind:value={selectedCardId} />
			</div>
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
			<Button
				class="w-fit"
				disabled={!csvFile || !csvMonth || !selectedCardId || loading}
				onclick={runCardPreview}
			>
				{loading ? 'Analisando…' : 'Analisar CSV'}
			</Button>
		</div>
	{:else if step === 'account-select'}
		<div class="grid gap-4">
			{#if showChoice}
				<button
					type="button"
					class="w-fit text-sm text-muted-foreground hover:text-foreground"
					onclick={() => (step = 'choose')}
				>
					← Voltar
				</button>
			{/if}
			<div class="grid gap-2">
				<Label for="csv-account">Conta</Label>
				<Select id="csv-account" options={activeAccountOptions} bind:value={selectedAccountId} />
			</div>
			<div class="grid gap-2">
				<Label for="csv-method">Método</Label>
				<Select
					id="csv-method"
					options={METHOD_OPTIONS}
					value={selectedMethod}
					onValueChange={(v) => (selectedMethod = v as typeof selectedMethod)}
				/>
				<p class="text-xs text-muted-foreground">
					Vale pro lote inteiro — o extrato não distingue método por linha.
				</p>
			</div>
			<div class="grid gap-2">
				<Label for="csv-account-file">Arquivo CSV</Label>
				<input
					id="csv-account-file"
					type="file"
					accept=".csv,text/csv"
					class="h-9 w-full rounded-lg border border-foreground/10 bg-transparent text-sm outline-none file:mr-3 file:h-full file:cursor-pointer file:border-0 file:bg-foreground/5 file:px-3 file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-ring"
					onchange={(e) => (accountFile = e.currentTarget.files?.[0] ?? null)}
				/>
				<p class="text-xs text-muted-foreground">
					Precisa ter data, descrição e valor — positivo é entrada, negativo é saída.
				</p>
			</div>
			<Button
				class="w-fit"
				disabled={!accountFile || !selectedAccountId || loading}
				onclick={runAccountPreview}
			>
				{loading ? 'Analisando…' : 'Analisar CSV'}
			</Button>
		</div>
	{:else if step === 'card-review'}
		<div class="grid gap-3">
			<p class="text-sm text-muted-foreground">
				{includedCount} linha{includedCount === 1 ? '' : 's'} selecionada{includedCount === 1
					? ''
					: 's'} pra importar de {cardReviewRows.length} lida{cardReviewRows.length === 1
					? ''
					: 's'}.
				{#if !headerDetected}
					Cabeçalho não reconhecido — colunas assumidas por posição, confira os valores abaixo.
				{/if}
			</p>
			<div class="overflow-x-auto rounded-xl border border-foreground/10">
				<table class="w-full min-w-[760px] text-sm">
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
						{#each cardReviewRows as row (row.rowIndex)}
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
												Parcela {row.installmentDetected.number} de {row.installmentDetected.total} —
												lança as próximas faturas
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
						{/each}
					</tbody>
				</table>
			</div>
			<div class="flex gap-2">
				<Button type="button" variant="outline" onclick={() => (step = 'card-select')}>
					Voltar
				</Button>
				<Button type="button" disabled={includedCount === 0 || loading} onclick={runCardConfirm}>
					{loading ? 'Importando…' : `Confirmar importação (${includedCount})`}
				</Button>
			</div>
		</div>
	{:else if step === 'account-review'}
		<div class="grid gap-3">
			<p class="text-sm text-muted-foreground">
				{includedCount} linha{includedCount === 1 ? '' : 's'} selecionada{includedCount === 1
					? ''
					: 's'} pra importar de {accountReviewRows.length} lida{accountReviewRows.length === 1
					? ''
					: 's'}.
				{#if !headerDetected}
					Cabeçalho não reconhecido — colunas assumidas por posição, confira os valores abaixo.
				{/if}
			</p>
			<div class="overflow-x-auto rounded-xl border border-foreground/10">
				<table class="w-full min-w-[760px] text-sm">
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
						{#each accountReviewRows as row (row.rowIndex)}
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
								<td class="px-3 py-2 whitespace-nowrap tabular-nums">{row.date || '—'}</td>
								<td class="px-3 py-2">
									{#if row.status === 'new'}
										<Input
											bind:value={row.description}
											disabled={!row.include}
											class="h-8 text-sm"
										/>
									{:else}
										<span class="text-muted-foreground">{row.description}</span>
									{/if}
								</td>
								<td class="px-3 py-2 text-right whitespace-nowrap tabular-nums">
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
						{/each}
					</tbody>
				</table>
			</div>
			<div class="flex gap-2">
				<Button type="button" variant="outline" onclick={() => (step = 'account-select')}>
					Voltar
				</Button>
				<Button type="button" disabled={includedCount === 0 || loading} onclick={runAccountConfirm}>
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
			{#if summary.skippedPaidInvoice && summary.skippedPaidInvoice > 0}
				<p class="text-sm text-muted-foreground">
					{summary.skippedPaidInvoice} parcela{summary.skippedPaidInvoice === 1 ? '' : 's'} futura{summary.skippedPaidInvoice ===
					1
						? ''
						: 's'} não lançada{summary.skippedPaidInvoice === 1 ? '' : 's'} — fatura já paga.
				</p>
			{/if}
			<Button type="button" class="w-fit" onclick={backToTransactions}
				>Voltar para Transações</Button
			>
		</div>
	{/if}
</div>
