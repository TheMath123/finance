<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

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

	const sortedInvoices = $derived(
		[...data.invoices].sort((a, b) =>
			a.yearReference !== b.yearReference
				? b.yearReference - a.yearReference
				: b.monthReference - a.monthReference
		)
	);
</script>

<svelte:head>
	<title>Faturas — {data.card.name} — Marcelus</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<div class="flex items-center justify-between gap-3">
		<div>
			<a
				href={resolve('/more/cards')}
				class="text-sm text-muted-foreground underline-offset-4 hover:underline"
			>
				← Cartões
			</a>
			<h1 class="text-xl font-semibold">Faturas — {data.card.name}</h1>
		</div>
	</div>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		{#each sortedInvoices as invoice (invoice.id)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				<div class="min-w-0">
					<p class="text-sm font-medium">
						{MONTH_NAMES[invoice.monthReference - 1]} de {invoice.yearReference}
					</p>
					<p class="text-sm text-muted-foreground">
						{STATUS_LABELS[invoice.effectiveStatus] ?? invoice.effectiveStatus}
					</p>
				</div>
				<div class="flex shrink-0 items-center gap-3">
					<span class="text-sm font-medium">{formatCents(invoice.total)}</span>
					{#if invoice.effectiveStatus !== 'paid' && invoice.total > 0}
						<Button variant="outline" size="sm" onclick={() => (paying = invoice)}>Pagar</Button>
					{/if}
				</div>
			</div>
		{:else}
			<p class="py-6 text-center text-sm text-muted-foreground">Nenhuma fatura ainda.</p>
		{/each}
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
