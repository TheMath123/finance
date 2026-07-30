<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { formatCents } from '$lib/money';
	import type { PlanView } from '$lib/server/admin-api';

	let { data, form } = $props();

	let createOpen = $state(false);
	let editing = $state<PlanView | null>(null);

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
	<title>Planos — SaaS</title>
</svelte:head>

{#snippet planFields(plan?: PlanView)}
	{#if !plan}
		<div class="grid gap-2">
			<Label for="key">Chave</Label>
			<Input id="key" name="key" placeholder="premium" required />
		</div>
	{/if}
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="grid gap-2">
			<Label for="name">Nome</Label>
			<Input id="name" name="name" value={plan?.name ?? ''} required />
		</div>
		<div class="grid gap-2">
			<Label for="price">Preço (R$)</Label>
			<Input
				id="price"
				name="price"
				value={plan ? (plan.priceCents / 100).toFixed(2).replace('.', ',') : ''}
				placeholder="0,00"
				required
			/>
		</div>
	</div>
	<div class="grid gap-2">
		<Label for="description">Descrição</Label>
		<Input id="description" name="description" value={plan?.description ?? ''} />
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="grid gap-2">
			<Label for="billingIntervalUnit">Intervalo de cobrança</Label>
			<select
				id="billingIntervalUnit"
				name="billingIntervalUnit"
				value={plan?.billingIntervalUnit ?? 'month'}
				class="h-9 rounded-lg border border-foreground/10 bg-background px-3 text-sm"
			>
				<option value="day">Dia</option>
				<option value="week">Semana</option>
				<option value="month">Mês</option>
				<option value="year">Ano</option>
			</select>
		</div>
		<div class="grid gap-2">
			<Label for="billingIntervalCount">A cada quantos</Label>
			<Input
				id="billingIntervalCount"
				name="billingIntervalCount"
				type="number"
				min="1"
				value={plan?.billingIntervalCount ?? 1}
				required
			/>
		</div>
	</div>
	<div class="grid gap-2 rounded-lg border border-foreground/10 p-3">
		<p class="text-xs font-medium text-muted-foreground">Limites</p>
		<div class="grid gap-3 sm:grid-cols-3">
			<div class="grid gap-1">
				<Label for="maxOwnedSharedWorkspaces" class="text-xs">Workspaces compartilhados</Label>
				<Input
					id="maxOwnedSharedWorkspaces"
					name="maxOwnedSharedWorkspaces"
					type="number"
					min="0"
					value={plan?.limits.maxOwnedSharedWorkspaces ?? 1}
					required
				/>
			</div>
			<div class="grid gap-1">
				<Label for="maxMembersPerWorkspace" class="text-xs">Membros por workspace</Label>
				<Input
					id="maxMembersPerWorkspace"
					name="maxMembersPerWorkspace"
					type="number"
					min="1"
					value={plan?.limits.maxMembersPerWorkspace ?? 5}
					required
				/>
			</div>
			<div class="grid gap-1">
				<Label for="maxSavedFormulasPerWorkspace" class="text-xs">Fórmulas salvas</Label>
				<Input
					id="maxSavedFormulasPerWorkspace"
					name="maxSavedFormulasPerWorkspace"
					type="number"
					min="0"
					value={plan?.limits.maxSavedFormulasPerWorkspace ?? 10}
					required
				/>
			</div>
		</div>
	</div>
	<div class="grid gap-2">
		<Label for="features">Features liberadas (separadas por vírgula)</Label>
		<Input
			id="features"
			name="features"
			value={plan?.features.join(', ') ?? ''}
			placeholder="ai_chat, csv_export"
		/>
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold">Planos</h1>
		<Button onclick={() => (createOpen = true)}>Novo plano</Button>
	</div>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="grid gap-2 sm:grid-cols-2">
		{#each data.plans as plan (plan.id)}
			<div
				class="flex flex-col gap-3 rounded-lg border border-foreground/10 p-4 {plan.isActive
					? ''
					: 'opacity-60'}"
			>
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="text-sm font-medium">
							{plan.name}
							<span class="text-xs text-muted-foreground">({plan.key})</span>
							{#if !plan.isActive}
								<span class="text-xs text-destructive">(inativo)</span>
							{/if}
						</p>
						<p class="text-sm text-muted-foreground">
							{formatCents(plan.priceCents)} / {INTERVAL_LABELS[plan.billingIntervalUnit]}
							{plan.billingIntervalCount > 1 ? `(a cada ${plan.billingIntervalCount})` : ''}
						</p>
					</div>
					<Button variant="outline" size="sm" onclick={() => (editing = plan)}>Editar</Button>
				</div>
				<div class="flex flex-wrap gap-1 text-xs text-muted-foreground">
					<span class="rounded-full bg-foreground/5 px-2 py-0.5">
						{plan.limits.maxOwnedSharedWorkspaces} workspace(s)
					</span>
					<span class="rounded-full bg-foreground/5 px-2 py-0.5">
						{plan.limits.maxMembersPerWorkspace} membro(s)
					</span>
					<span class="rounded-full bg-foreground/5 px-2 py-0.5">
						{plan.limits.maxSavedFormulasPerWorkspace} fórmula(s)
					</span>
					{#each plan.features as feature (feature)}
						<span class="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{feature}</span>
					{/each}
				</div>
				<form
					method="POST"
					action={plan.isActive ? '?/deactivate' : '?/activate'}
					use:enhance
					class="self-start"
				>
					<input type="hidden" name="id" value={plan.id} />
					<Button type="submit" variant={plan.isActive ? 'destructive' : 'default'} size="sm">
						{plan.isActive ? 'Desativar' : 'Ativar'}
					</Button>
				</form>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
		{/each}
	</div>
</div>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Novo plano</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/create"
			class="grid gap-4"
			use:enhance={() => closeOnSuccess(() => (createOpen = false))}
		>
			{@render planFields()}
			<Dialog.Footer>
				<Button type="submit">Criar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={editing !== null} onOpenChange={(open) => !open && (editing = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Editar plano</Dialog.Title>
		</Dialog.Header>
		{#if editing}
			<form
				method="POST"
				action="?/update"
				class="grid gap-4"
				use:enhance={() => closeOnSuccess(() => (editing = null))}
			>
				<input type="hidden" name="id" value={editing.id} />
				{@render planFields(editing)}
				<Dialog.Footer>
					<Button type="submit">Salvar</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
