<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { dialogFormSubmit } from '$lib/dialog-form';
	import { formatCents } from '$lib/money';

	let { data, form } = $props();

	let createOpen = $state(false);
	let createError = $state<string | null>(null);

	function timeLeft(iso: string): string {
		const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
		return days <= 0 ? 'expira hoje' : `expira em ${days}d`;
	}

	const activeAccounts = $derived(data.accounts.filter((a) => !a.archivedAt));
</script>

<svelte:head>
	<title>Transferências — Marcelus</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="text-lg font-semibold">Transferências</h2>
		<Button
			onclick={() => {
				createError = null;
				createOpen = true;
			}}
		>
			Nova transferência
		</Button>
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
								<select
									name="accountId"
									required
									class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<option value="" disabled selected>Receber em qual conta?</option>
									{#each data.transferAccounts as account (account.accountId)}
										<option value={account.accountId}>
											{account.accountName} · {account.workspaceName}
										</option>
									{/each}
								</select>
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

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Nova transferência</Dialog.Title>
		</Dialog.Header>
		{#if createError}
			<p class="text-sm text-destructive">{createError}</p>
		{/if}
		<form
			method="POST"
			action="?/create"
			class="grid gap-4"
			use:enhance={dialogFormSubmit({
				onSuccess: () => {
					createOpen = false;
					createError = null;
				},
				onError: (message) => {
					createError = message;
				}
			})}
		>
			<div class="grid gap-2">
				<Label for="transfer-recipient">Destinatário</Label>
				<Input id="transfer-recipient" name="recipient" placeholder="Telefone ou e-mail" required />
			</div>
			<div class="grid gap-2">
				<Label for="transfer-amount">Valor</Label>
				<Input id="transfer-amount" name="amount" inputmode="decimal" placeholder="0,00" required />
			</div>
			<div class="grid gap-2">
				<Label for="transfer-description">Descrição</Label>
				<Input
					id="transfer-description"
					name="description"
					placeholder="Ex.: Aluguel dividido"
					required
				/>
			</div>
			<div class="grid gap-2">
				<Label for="transfer-account">Conta de origem</Label>
				<select
					id="transfer-account"
					name="accountId"
					required
					class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{#each activeAccounts as account (account.id)}
						<option value={account.id}>{account.name}</option>
					{/each}
				</select>
			</div>
			<Dialog.Footer>
				<Button type="submit">Enviar transferência</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
