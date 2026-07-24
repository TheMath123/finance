<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';

	let { data, form } = $props();

	const canManage = $derived(
		data.activeWorkspace?.role === 'owner' || data.activeWorkspace?.role === 'admin'
	);

	const ROLE_LABELS: Record<string, string> = {
		owner: 'Dono',
		admin: 'Admin',
		member: 'Membro',
		viewer: 'Visualização'
	};
</script>

<svelte:head>
	<title>Membros — Finance</title>
</svelte:head>

<div class="flex flex-col gap-6">
	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<!-- Linhas com divisor no topo, sem card — linguagem do Figma. -->
	<div>
		{#each data.members as member (member.userId)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				<div class="min-w-0">
					<p class="truncate text-sm font-medium">{member.name}</p>
					<p class="truncate text-sm text-muted-foreground">{member.email}</p>
				</div>
				{#if canManage && member.role !== 'owner' && member.userId !== data.user.id}
					<div class="flex items-center gap-2">
						<form method="POST" action="?/updateRole" use:enhance>
							<input type="hidden" name="userId" value={member.userId} />
							<select
								name="role"
								value={member.role}
								onchange={(e) => e.currentTarget.form?.requestSubmit()}
								class="rounded-lg border border-foreground/10 bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<option value="admin">Admin</option>
								<option value="member">Membro</option>
								<option value="viewer">Visualização</option>
							</select>
						</form>
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="userId" value={member.userId} />
							<Button type="submit" variant="destructive" size="sm">Remover</Button>
						</form>
					</div>
				{:else}
					<span class="rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
						{ROLE_LABELS[member.role] ?? member.role}
					</span>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum membro encontrado.</p>
		{/each}
	</div>
</div>
