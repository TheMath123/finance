<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { MONTH_NAMES } from '$lib/month-names';
	import { formatCents } from '$lib/money';
	import type { InvoiceView } from '$lib/server/invoice-api';

	let { data, form } = $props();

	let paying = $state<InvoiceView | null>(null);

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
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-sm font-medium text-muted-foreground">Histórico</h2>
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
