<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { formatCents } from '$lib/money';

	let { data } = $props();

	const byCategory = $derived(
		[...data.estimate.byCategory].sort((a, b) => b.estimated - a.estimated)
	);
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<div>
		<h2 class="text-lg font-semibold">Gasto variável</h2>
		<p class="text-sm text-muted-foreground">
			Média dos últimos 3 meses por categoria — só o que não é recorrência nem parcela. Usado pra
			estimar o disponível projetado do mês.
		</p>
	</div>

	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-2 py-6">
			<p class="text-sm text-muted-foreground">Estimado por mês</p>
			<p class="text-3xl font-semibold">{formatCents(data.estimate.total)}</p>
		</Card.Content>
	</Card.Root>

	{#if byCategory.length > 0}
		<div class="flex flex-col gap-2">
			{#each byCategory as category (category.categoryId)}
				<Card.Root>
					<Card.Content class="flex items-center justify-between py-3">
						<div class="flex items-center gap-3">
							<span class="h-3 w-3 rounded-full" style="background-color: {category.color}"></span>
							<span class="text-sm font-medium">{category.name}</span>
						</div>
						<span class="text-sm font-semibold">{formatCents(category.estimated)}</span>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<Card.Root>
			<Card.Content class="py-6 text-center text-sm text-muted-foreground">
				Sem histórico suficiente ainda — a estimativa aparece depois de alguns meses de uso.
			</Card.Content>
		</Card.Root>
	{/if}
</div>
