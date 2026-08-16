<script lang="ts">
	import { enhance } from '$app/forms';

	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { formatCents } from '$lib/money';

	let { data } = $props();

	let tab = $state<'owed-by-me' | 'owed-to-me'>('owed-by-me');

	const STATUS_LABELS: Record<string, string> = {
		pending: 'Pendente',
		paid: 'Pago, aguardando confirmação',
		confirmed: 'Confirmado'
	};
</script>

<div class="flex flex-col gap-6">
	<h2 class="text-lg font-semibold">Splits</h2>

	<div class="flex gap-2">
		<Button
			variant={tab === 'owed-by-me' ? 'default' : 'outline'}
			size="sm"
			onclick={() => (tab = 'owed-by-me')}
		>
			O que eu devo
		</Button>
		<Button
			variant={tab === 'owed-to-me' ? 'default' : 'outline'}
			size="sm"
			onclick={() => (tab = 'owed-to-me')}
		>
			O que me devem
		</Button>
	</div>

	{#if tab === 'owed-by-me'}
		{#if data.owedByMe.length > 0}
			<div class="flex flex-col gap-2">
				{#each data.owedByMe as share (share.shareId)}
					<Card.Root>
						<Card.Content class="flex flex-col gap-2 py-4">
							<p class="text-sm font-medium">{share.transactionDescription}</p>
							<p class="text-sm text-muted-foreground">Você deve pra {share.creatorName}</p>
							<div class="flex items-center justify-between">
								<span class="text-lg font-semibold">{formatCents(share.amount)}</span>
								<span class="text-sm text-muted-foreground">{STATUS_LABELS[share.status]}</span>
							</div>
							{#if share.status === 'pending'}
								<form method="POST" action="?/markPaid" use:enhance>
									<input type="hidden" name="shareId" value={share.shareId} />
									<Button type="submit" class="w-full">Marcar como pago</Button>
								</form>
							{/if}
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<Card.Root>
				<Card.Content class="py-6 text-center text-sm text-muted-foreground">
					Você não deve nada no momento.
				</Card.Content>
			</Card.Root>
		{/if}
	{:else if data.owedToMe.length > 0}
		<div class="flex flex-col gap-2">
			{#each data.owedToMe as share (share.shareId)}
				{@const canConfirm = share.status === (share.participantUserId ? 'paid' : 'pending')}
				<Card.Root>
					<Card.Content class="flex flex-col gap-2 py-4">
						<p class="text-sm font-medium">{share.transactionDescription}</p>
						<p class="text-sm text-muted-foreground">{share.participantName} te deve</p>
						<div class="flex items-center justify-between">
							<span class="text-lg font-semibold">{formatCents(share.amount)}</span>
							<span class="text-sm text-muted-foreground">{STATUS_LABELS[share.status]}</span>
						</div>
						{#if canConfirm}
							<form method="POST" action="?/confirm" use:enhance>
								<input type="hidden" name="shareId" value={share.shareId} />
								<Button type="submit" class="w-full">Confirmar recebimento</Button>
							</form>
						{:else}
							<p class="text-sm text-muted-foreground">
								Aguardando {share.participantName} marcar como pago.
							</p>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<Card.Root>
			<Card.Content class="py-6 text-center text-sm text-muted-foreground">
				Ninguém te deve nada no momento.
			</Card.Content>
		</Card.Root>
	{/if}
</div>
