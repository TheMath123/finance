<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Select } from '$lib/components/ui/select';
	import { formatCents } from '$lib/money';

	let { data, form } = $props();

	function timeLeft(iso: string): string {
		const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
		return days <= 0 ? 'expira hoje' : `expira em ${days}d`;
	}

	const transferAccountOptions = $derived(
		data.transferAccounts.map((account) => ({
			value: account.accountId,
			label: `${account.accountName} · ${account.workspaceName}`
		}))
	);

	/** Uma seleção por transferência pendente (cada card tem seu próprio form/select). */
	let pendingAccountSelection = $state<Record<string, string>>({});
</script>

<svelte:head>
	<title>Transferências — Marcelus</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="text-lg font-semibold">Transferências</h2>
		<Button href={resolve('/transactions')} variant="outline"
			>Nova transferência em Transações</Button
		>
	</div>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		<h3 class="mb-2 text-sm font-medium text-muted-foreground">Pendentes recebidas</h3>
		{#if data.pending.length > 0}
			<div class="flex flex-col gap-3">
				{#each data.pending as transfer (transfer.id)}
					<Card.Root>
						<Card.Content class="flex flex-col gap-3 py-4">
							<div>
								<p class="text-sm font-medium">{transfer.fromUserName}</p>
								<p class="text-sm text-muted-foreground">{transfer.description}</p>
								<p class="text-xs text-muted-foreground">{timeLeft(transfer.expiresAt)}</p>
							</div>
							<p class="text-lg font-semibold">{formatCents(transfer.amount)}</p>
							<form method="POST" action="?/accept" use:enhance class="flex flex-col gap-2">
								<input type="hidden" name="transferId" value={transfer.id} />
								<Select
									name="accountId"
									required
									placeholder="Receber em qual conta?"
									options={transferAccountOptions}
									value={pendingAccountSelection[transfer.id] ?? ''}
									onValueChange={(v) => (pendingAccountSelection[transfer.id] = v)}
								/>
								<label class="flex items-center gap-2 text-sm text-muted-foreground">
									<input type="checkbox" name="markTrusted" value="true" />
									Confiar em quem enviou — próximas entram automático
								</label>
								<div class="flex gap-2">
									<Button
										type="submit"
										formaction="?/reject"
										formnovalidate
										variant="outline"
										class="flex-1"
									>
										Recusar
									</Button>
									<Button type="submit" class="flex-1">Aceitar</Button>
								</div>
							</form>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<Card.Root>
				<Card.Content class="py-6 text-center text-sm text-muted-foreground">
					Nenhuma transferência pendente.
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<div>
		<h3 class="mb-2 text-sm font-medium text-muted-foreground">Contatos confiáveis</h3>
		{#if data.trustedContacts.length > 0}
			<div class="flex flex-col gap-2">
				{#each data.trustedContacts as contact (contact.id)}
					<Card.Root>
						<Card.Content class="flex items-center justify-between py-3">
							<span class="text-sm font-medium">{contact.trustedUserName}</span>
							<form method="POST" action="?/removeTrustedContact" use:enhance>
								<input type="hidden" name="id" value={contact.id} />
								<Button type="submit" variant="ghost" size="sm" class="text-destructive">
									Remover
								</Button>
							</form>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<Card.Root>
				<Card.Content class="py-6 text-center text-sm text-muted-foreground">
					Nenhum contato confiável ainda.
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
