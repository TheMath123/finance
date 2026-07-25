<script lang="ts">
	let { data } = $props();

	/** Paleta categórica validada (skill dataviz) — ordem fixa, nunca ciclada dentro de um mesmo grupo. */
	const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

	const PLAN_LABELS: Record<string, string> = { free: 'Free', premium: 'Premium' };
	const TYPE_LABELS: Record<string, string> = {
		personal: 'Pessoal',
		family: 'Família',
		business: 'Empresarial'
	};
	const LAYER_LABELS: Record<number, string> = {
		1: 'Camada 1 — roteador barato',
		2: 'Camada 2 — agente analítico'
	};

	function withColor<T extends { count: number }>(rows: T[]) {
		const max = Math.max(1, ...rows.map((r) => r.count));
		return rows.map((r, i) => ({
			...r,
			color: PALETTE[i % PALETTE.length],
			pct: (r.count / max) * 100
		}));
	}

	const workspacesByPlan = $derived(data.metrics ? withColor(data.metrics.workspacesByPlan) : []);
	const workspacesByType = $derived(data.metrics ? withColor(data.metrics.workspacesByType) : []);

	const aiUsageRows = $derived(
		data.metrics
			? data.metrics.aiUsageByLayer.map((u) => ({
					...u,
					totalTokens: u.totalInputTokens + u.totalOutputTokens
				}))
			: []
	);
	const maxAiTokens = $derived(Math.max(1, ...aiUsageRows.map((u) => u.totalTokens)));
</script>

<svelte:head>
	<title>Métricas — Admin</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<h1 class="text-xl font-semibold">Métricas da plataforma</h1>

	{#if !data.metrics}
		<p class="text-sm text-muted-foreground">Não foi possível carregar as métricas.</p>
	{:else}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="text-sm text-muted-foreground">Usuários</p>
				<p class="mt-1 text-2xl font-semibold">{data.metrics.totalUsers}</p>
			</div>
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="text-sm text-muted-foreground">Suspensos</p>
				<p class="mt-1 text-2xl font-semibold text-destructive">
					{data.metrics.suspendedUsers}
				</p>
			</div>
			<div class="rounded-lg border border-foreground/10 p-4">
				<p class="text-sm text-muted-foreground">Transações este mês</p>
				<p class="mt-1 text-2xl font-semibold">{data.metrics.transactionsThisMonth}</p>
			</div>
		</div>

		<div class="grid gap-6 sm:grid-cols-2">
			<div>
				<h2 class="mb-3 text-sm font-medium text-muted-foreground">Workspaces por plano</h2>
				<table class="w-full text-sm">
					<tbody>
						{#each workspacesByPlan as row (row.plan)}
							<tr class="border-b border-foreground/10 last:border-0">
								<td class="w-1/3 py-2 pr-3">
									<span class="inline-flex items-center gap-2">
										<span
											class="h-2.5 w-2.5 shrink-0 rounded-full"
											style="background-color: {row.color}"
										></span>
										<span class="truncate">{PLAN_LABELS[row.plan] ?? row.plan}</span>
									</span>
								</td>
								<td class="py-2">
									<div class="h-2.5 bg-transparent">
										<div
											class="h-2.5 rounded-r"
											style="width: {row.pct}%; background-color: {row.color}"
										></div>
									</div>
								</td>
								<td class="py-2 pl-3 text-right font-medium tabular-nums">{row.count}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div>
				<h2 class="mb-3 text-sm font-medium text-muted-foreground">Workspaces por tipo</h2>
				<table class="w-full text-sm">
					<tbody>
						{#each workspacesByType as row (row.type)}
							<tr class="border-b border-foreground/10 last:border-0">
								<td class="w-1/3 py-2 pr-3">
									<span class="inline-flex items-center gap-2">
										<span
											class="h-2.5 w-2.5 shrink-0 rounded-full"
											style="background-color: {row.color}"
										></span>
										<span class="truncate">{TYPE_LABELS[row.type] ?? row.type}</span>
									</span>
								</td>
								<td class="py-2">
									<div class="h-2.5 bg-transparent">
										<div
											class="h-2.5 rounded-r"
											style="width: {row.pct}%; background-color: {row.color}"
										></div>
									</div>
								</td>
								<td class="py-2 pl-3 text-right font-medium tabular-nums">{row.count}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div>
			<h2 class="mb-1 text-sm font-medium text-muted-foreground">
				Gasto de tokens de IA por camada (últimos 30 dias)
			</h2>
			<p class="mb-3 text-xs text-muted-foreground">
				Camada 0 (determinística) não aparece — nunca chama IA, custo zero.
			</p>
			{#if aiUsageRows.length === 0}
				<p class="text-sm text-muted-foreground">Nenhuma chamada de IA registrada no período.</p>
			{:else}
				<table class="w-full text-sm">
					<tbody>
						{#each aiUsageRows as row, i (row.layer)}
							<tr class="border-b border-foreground/10 last:border-0">
								<td class="w-1/3 py-2 pr-3">
									<span class="inline-flex items-center gap-2">
										<span
											class="h-2.5 w-2.5 shrink-0 rounded-full"
											style="background-color: {PALETTE[i % PALETTE.length]}"
										></span>
										<span class="truncate">{LAYER_LABELS[row.layer] ?? `Camada ${row.layer}`}</span>
									</span>
								</td>
								<td class="py-2">
									<div class="h-2.5 bg-transparent">
										<div
											class="h-2.5 rounded-r"
											style="width: {(row.totalTokens / maxAiTokens) *
												100}%; background-color: {PALETTE[i % PALETTE.length]}"
										></div>
									</div>
								</td>
								<td class="py-2 pl-3 text-right tabular-nums">
									<p class="font-medium">{row.totalTokens.toLocaleString('pt-BR')} tokens</p>
									<p class="text-xs text-muted-foreground">{row.callCount} chamadas</p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}
</div>
