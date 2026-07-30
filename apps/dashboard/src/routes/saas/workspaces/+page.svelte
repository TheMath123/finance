<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import type { AdminWorkspaceView } from '$lib/server/admin-api';

	let { data, form } = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));

	let changingPlan = $state<AdminWorkspaceView | null>(null);

	const INTERVAL_LABELS: Record<string, string> = {
		day: 'dia',
		week: 'semana',
		month: 'mês',
		year: 'ano'
	};

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
</script>

<svelte:head>
	<title>Workspaces — SaaS</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold">Workspaces</h1>
		<p class="text-sm text-muted-foreground">{data.total} no total</p>
	</div>

	<form method="GET" class="flex gap-2">
		<Input type="search" name="q" value={data.search} placeholder="Buscar por nome" />
		<Button type="submit">Buscar</Button>
	</form>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="flex flex-col gap-2">
		{#each data.workspaces as workspace (workspace.id)}
			<div
				class="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 px-4 py-3"
			>
				<div class="min-w-0">
					<p class="truncate text-sm font-medium">{workspace.name}</p>
					<p class="truncate text-sm text-muted-foreground">
						{workspace.ownerName ?? 'Sem dono'}
						{workspace.ownerEmail ? `(${workspace.ownerEmail})` : ''}
						· {workspace.memberCount} membro(s)
					</p>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<span class="rounded-full bg-foreground/5 px-2 py-1 text-xs text-muted-foreground">
						{workspace.plan.name} / {INTERVAL_LABELS[workspace.plan.billingIntervalUnit]}
					</span>
					<Button variant="outline" size="sm" onclick={() => (changingPlan = workspace)}>
						Mudar plano
					</Button>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum workspace encontrado.</p>
		{/each}
	</div>

	{#if totalPages > 1}
		<div class="flex items-center justify-center gap-2">
			<form method="GET">
				<input type="hidden" name="q" value={data.search} />
				<input type="hidden" name="page" value={data.page - 1} />
				<Button type="submit" variant="outline" size="sm" disabled={data.page <= 1}>
					Anterior
				</Button>
			</form>
			<span class="text-sm text-muted-foreground">Página {data.page} de {totalPages}</span>
			<form method="GET">
				<input type="hidden" name="q" value={data.search} />
				<input type="hidden" name="page" value={data.page + 1} />
				<Button type="submit" variant="outline" size="sm" disabled={data.page >= totalPages}>
					Próxima
				</Button>
			</form>
		</div>
	{/if}
</div>

<Dialog.Root open={changingPlan !== null} onOpenChange={(open) => !open && (changingPlan = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Mudar plano — {changingPlan?.name}</Dialog.Title>
		</Dialog.Header>
		{#if changingPlan}
			<form
				method="POST"
				action="?/setPlan"
				class="grid gap-4"
				use:enhance={() => closeOnSuccess(() => (changingPlan = null))}
			>
				<input type="hidden" name="workspaceId" value={changingPlan.id} />
				<select
					name="planId"
					class="h-9 rounded-lg border border-foreground/10 bg-background px-3 text-sm"
				>
					{#each data.plans as plan (plan.id)}
						<option value={plan.id} selected={plan.id === changingPlan.plan.id}>
							{plan.name} — {plan.priceCents === 0
								? 'grátis'
								: `R$ ${(plan.priceCents / 100).toFixed(2)}`}
						</option>
					{/each}
				</select>
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
