<script lang="ts">
	import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon';

	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import { MONTH_NAMES } from '$lib/month-names';
	import { formatCents } from '$lib/money';
	import type { InvoiceView } from '$lib/server/invoice-api';

	let { data, form } = $props();

	let paying = $state<InvoiceView | null>(null);
	let payError = $state<string | null>(null);
	// Confirmação extra pra pagar fatura ainda aberta (não fechada) — pagar
	// antes do fechamento trava novas compras que cairiam nela (imutabilidade
	// de fatura paga já existe no backend), então avisa e exige um passo a mais.
	let confirmedEarlyPayment = $state(false);
	const isEarlyPayment = $derived(paying?.effectiveStatus === 'open');

	// Estado dos selects (custom, não-nativo — ver ui/select) do form "pagar
	// fatura" — reseedados sempre que o dialog abre pra uma fatura diferente.
	let payAccountId = $state('');
	let payMethod = $state<'pix' | 'debit'>('pix');
	const payAccountOptions = $derived(
		data.accounts.map((account) => ({ value: account.id, label: account.name }))
	);
	const PAY_METHOD_OPTIONS = [
		{ value: 'pix', label: 'Pix' },
		{ value: 'debit', label: 'Débito' }
	];

	function openPayDialog(invoice: InvoiceView) {
		confirmedEarlyPayment = false;
		payError = null;
		payAccountId = data.accounts[0]?.id ?? '';
		payMethod = 'pix';
		paying = invoice;
	}

	// Mês/ano padrão pro link de "Importar CSV" — a rota /import lê da query
	// string, sem precisar recarregar faturas/mês corrente por conta própria.
	function defaultCsvMonth(): { month: number; year: number } {
		if (data.monthFilter && data.yearFilter) {
			return { month: data.monthFilter, year: data.yearFilter };
		}
		if (data.current) {
			return { month: data.current.monthReference, year: data.current.yearReference };
		}
		const now = new Date();
		return { month: now.getMonth() + 1, year: now.getFullYear() };
	}
	const csvImportHref = $derived.by(() => {
		const { month, year } = defaultCsvMonth();
		return `${resolve(`/more/cards/${data.card.id}/invoices/import`)}?month=${month}&year=${year}`;
	});

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

	// A fatura em destaque já vem separada do backend — evita mostrá-la de novo
	// na lista de histórico quando ela cair na página/filtro atual.
	const historyInvoices = $derived(data.invoices.filter((i) => i.id !== data.current?.id));
	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));

	// --- Filtro de histórico (mês/ano) — dois selects, nunca uma combinação vazia ---

	// availablePeriods já vem ordenado desc (ano, mês); Set preserva a ordem de
	// primeira ocorrência, então os anos saem do mais recente pro mais antigo.
	const filterYears = $derived([...new Set(data.availablePeriods.map((p) => p.year))]);
	let filterYear = $state<number | undefined>(undefined);
	let filterMonth = $state<number | undefined>(undefined);

	// Ressincroniza os selects com o filtro real aplicado no servidor (Filtrar,
	// Limpar, paginação ou URL direta) — um `$state` só captura o valor inicial
	// de `data`, então sem isso "Limpar" deixava os selects presos no mês antigo
	// mesmo com a lista já destravada.
	$effect(() => {
		filterYear = data.yearFilter ?? data.availablePeriods[0]?.year;
		filterMonth = data.monthFilter ?? data.availablePeriods[0]?.month;
	});

	const filterMonthsForYear = $derived(
		data.availablePeriods
			.filter((p) => p.year === filterYear)
			.map((p) => p.month)
			.sort((a, b) => a - b)
	);
	const filterMonthOptions = $derived(
		filterMonthsForYear.map((month) => ({ value: String(month), label: MONTH_NAMES[month - 1] }))
	);
	const filterYearOptions = $derived(
		filterYears.map((year) => ({ value: String(year), label: String(year) }))
	);

	// Trocar o ano no select (antes de enviar o form) pode deixar o mês
	// escolhido sem fatura naquele ano — reancora no mês mais recente
	// disponível pro ano selecionado.
	$effect(() => {
		if (
			filterMonthsForYear.length > 0 &&
			(filterMonth === undefined || !filterMonthsForYear.includes(filterMonth))
		) {
			filterMonth = filterMonthsForYear[filterMonthsForYear.length - 1]!;
		}
	});
</script>

<svelte:head>
	<title>Faturas — {data.card.name} — Marcelus</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center gap-3">
		<a
			href={resolve('/more/cards')}
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
			aria-label="Voltar para Cartões"
		>
			<ArrowLeftIcon size={18} />
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
				<Button class="mt-4" onclick={() => openPayDialog(data.current!)}>Pagar fatura</Button>
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
					<Button type="button" variant="outline" size="sm" href={csvImportHref}>
						Importar CSV
					</Button>
				{/if}
				{#if data.availablePeriods.length > 0}
					<form method="GET" class="flex items-center gap-2">
						<Label for="filter-month" class="sr-only">Mês</Label>
						<Select
							id="filter-month"
							name="month"
							options={filterMonthOptions}
							value={filterMonth !== undefined ? String(filterMonth) : ''}
							onValueChange={(v) => (filterMonth = v ? Number(v) : undefined)}
							class="h-8 w-36"
						/>
						<Label for="filter-year" class="sr-only">Ano</Label>
						<Select
							id="filter-year"
							name="year"
							options={filterYearOptions}
							value={filterYear !== undefined ? String(filterYear) : ''}
							onValueChange={(v) => (filterYear = v ? Number(v) : undefined)}
							class="h-8 w-24"
						/>
						<Button type="submit" variant="outline" size="sm">Filtrar</Button>
						{#if data.monthFilter && data.yearFilter}
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
				{/if}
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
							<Button variant="outline" size="sm" onclick={() => openPayDialog(invoice)}>
								Pagar
							</Button>
						{:else if invoice.effectiveStatus === 'paid'}
							<form
								method="POST"
								action="?/undoPayment"
								use:enhance
								onsubmit={(event) => {
									if (
										!confirm(
											'Desfazer o pagamento? Isso reabre a fatura e exclui a transação de pagamento da conta.'
										)
									) {
										event.preventDefault();
									}
								}}
							>
								<input type="hidden" name="invoiceId" value={invoice.id} />
								<Button type="submit" variant="destructive" size="sm">Desfazer pagamento</Button>
							</form>
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
					<input type="hidden" name="month" value={data.monthFilter ?? ''} />
					<input type="hidden" name="year" value={data.yearFilter ?? ''} />
					<input type="hidden" name="page" value={data.page - 1} />
					<Button type="submit" variant="outline" size="sm" disabled={data.page <= 1}>
						Anterior
					</Button>
				</form>
				<span class="text-sm text-muted-foreground">Página {data.page} de {totalPages}</span>
				<form method="GET">
					<input type="hidden" name="month" value={data.monthFilter ?? ''} />
					<input type="hidden" name="year" value={data.yearFilter ?? ''} />
					<input type="hidden" name="page" value={data.page + 1} />
					<Button type="submit" variant="outline" size="sm" disabled={data.page >= totalPages}>
						Próxima
					</Button>
				</form>
			</div>
		{/if}
	</div>
</div>

<Dialog.Root
	open={paying !== null}
	onOpenChange={(open) => {
		if (!open) {
			paying = null;
			payError = null;
		}
	}}
>
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
		{#if payError}
			<p class="text-sm text-destructive">{payError}</p>
		{/if}
		{#if paying}
			<form
				method="POST"
				action="?/pay"
				class="grid gap-4"
				use:enhance={dialogFormSubmit({
					onSuccess: () => {
						paying = null;
						payError = null;
					},
					onError: (message) => {
						payError = message;
					}
				})}
			>
				<input type="hidden" name="invoiceId" value={paying.id} />
				{#if isEarlyPayment}
					<div class="grid gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
						<p class="text-sm">
							Essa fatura ainda está aberta (fecha dia {data.card.closingDay}). Pagar agora trava
							novas compras que cairiam nela até lá — elas vão falhar até a próxima fatura.
						</p>
						<label class="flex items-center gap-2 text-sm font-medium">
							<input type="checkbox" bind:checked={confirmedEarlyPayment} class="h-4 w-4" />
							Entendo, quero pagar mesmo assim
						</label>
					</div>
				{/if}
				<div class="grid gap-2">
					<Label for="pay-account">Conta</Label>
					<Select
						id="pay-account"
						name="accountId"
						required
						options={payAccountOptions}
						bind:value={payAccountId}
					/>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label for="pay-date">Data</Label>
						<DatePicker id="pay-date" name="date" value={todayIso()} required />
					</div>
					<div class="grid gap-2">
						<Label for="pay-method">Método</Label>
						<Select
							id="pay-method"
							name="method"
							options={PAY_METHOD_OPTIONS}
							value={payMethod}
							onValueChange={(v) => (payMethod = v as typeof payMethod)}
						/>
					</div>
				</div>
				<Dialog.Footer>
					<Button type="submit" disabled={isEarlyPayment && !confirmedEarlyPayment}>
						Confirmar pagamento
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
