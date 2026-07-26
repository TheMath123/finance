<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let { data, form } = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
</script>

<svelte:head>
	<title>Usuários — SaaS</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold">Usuários</h1>
		<p class="text-sm text-muted-foreground">{data.total} no total</p>
	</div>

	<form method="GET" class="flex gap-2">
		<Input type="search" name="q" value={data.search} placeholder="Buscar por nome ou e-mail" />
		<Button type="submit">Buscar</Button>
	</form>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="flex flex-col gap-2">
		{#each data.users as user (user.id)}
			<div
				class="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 px-4 py-3"
			>
				<div class="min-w-0">
					<p class="truncate text-sm font-medium">
						{user.name}
						{#if user.platformRole === 'superadmin'}
							<span class="text-xs text-primary">(superadmin)</span>
						{/if}
						{#if user.suspendedAt}
							<span class="text-xs text-destructive">(suspenso)</span>
						{/if}
					</p>
					<p class="truncate text-sm text-muted-foreground">{user.email}</p>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					{#if user.suspendedAt}
						<form method="POST" action="?/reactivate" use:enhance>
							<input type="hidden" name="userId" value={user.id} />
							<Button type="submit" variant="outline" size="sm">Reativar</Button>
						</form>
					{:else}
						<form method="POST" action="?/suspend" use:enhance>
							<input type="hidden" name="userId" value={user.id} />
							<Button type="submit" variant="destructive" size="sm">Suspender</Button>
						</form>
					{/if}
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
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
