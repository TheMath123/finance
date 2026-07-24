<script lang="ts">
	import { formatDateTime } from '$lib/format';

	let { data } = $props();

	const ACTION_LABELS: Record<string, string> = {
		create: 'criou',
		update: 'editou',
		delete: 'excluiu'
	};

	const ENTITY_LABELS: Record<string, string> = {
		transaction: 'uma transação',
		account: 'uma conta',
		card: 'um cartão',
		bank: 'um banco',
		category: 'uma categoria',
		workspace: 'o workspace',
		recurring_transaction: 'uma recorrência'
	};
</script>

<svelte:head>
	<title>Atividade — Finance</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		{#each data.activity as entry (entry.id)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				<p class="min-w-0 truncate text-sm">
					<span class="font-medium">{entry.userName ?? 'Usuário removido'}</span>
					{ACTION_LABELS[entry.action] ?? entry.action}
					{ENTITY_LABELS[entry.entity] ?? entry.entity}
				</p>
				<span class="shrink-0 text-sm text-muted-foreground">
					{formatDateTime(entry.createdAt)}
				</span>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
		{/each}
	</div>
</div>
