<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import type { TransactionView } from '$lib/server/transaction-api';

	let {
		transaction,
		onerror
	}: {
		transaction: TransactionView;
		onerror: (message: string) => void;
	} = $props();

	// Override local — depois de anexar/remover, `update()` só refaz o load da
	// página (novo array `data.transactions`), mas `transaction` aqui continua
	// sendo a referência congelada no momento em que o dialog abriu. Sem isso a
	// prévia só atualizaria depois de fechar e reabrir o dialog (mesmo
	// problema documentado no `attachment-field.tsx` do mobile).
	let override = $state<{ transactionId: string; present: boolean } | null>(null);
	const hasAttachment = $derived(
		override?.transactionId === transaction.id
			? override.present
			: Boolean(transaction.attachmentKey)
	);

	let previewUrl = $state<string | null>(null);
	let loadingPreview = $state(false);

	$effect(() => {
		if (!hasAttachment) {
			previewUrl = null;
			return;
		}
		loadingPreview = true;
		fetch(`/transactions/${transaction.id}/attachment`)
			.then((r) => r.json())
			.then((data: { url?: string }) => {
				if (data.url) previewUrl = data.url;
			})
			.finally(() => {
				loadingPreview = false;
			});
	});
</script>

<div class="grid gap-2">
	<Label>Comprovante</Label>
	{#if hasAttachment}
		{#if loadingPreview}
			<p class="text-sm text-muted-foreground">Carregando prévia…</p>
		{:else if previewUrl}
			<img
				src={previewUrl}
				alt="Comprovante anexado"
				class="max-h-48 w-full rounded-lg border border-foreground/10 object-cover"
			/>
		{/if}
		<form
			method="POST"
			action="?/deleteAttachment"
			use:enhance={dialogFormSubmit({
				onSuccess: () => {
					override = { transactionId: transaction.id, present: false };
				},
				onError: onerror
			})}
		>
			<input type="hidden" name="transactionId" value={transaction.id} />
			<Button type="submit" variant="outline" size="sm">Remover comprovante</Button>
		</form>
	{:else}
		<form
			method="POST"
			action="?/uploadAttachment"
			enctype="multipart/form-data"
			use:enhance={dialogFormSubmit({
				onSuccess: () => {
					override = { transactionId: transaction.id, present: true };
				},
				onError: onerror
			})}
			class="flex items-center gap-2"
		>
			<input type="hidden" name="transactionId" value={transaction.id} />
			<input
				type="file"
				name="file"
				accept="image/*"
				required
				class="flex-1 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary"
			/>
			<Button type="submit" variant="outline" size="sm">Anexar</Button>
		</form>
	{/if}
</div>
