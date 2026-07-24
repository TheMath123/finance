<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { formatDate } from '$lib/format';

	let { data, form } = $props();

	const canManage = $derived(
		data.activeWorkspace?.role === 'owner' || data.activeWorkspace?.role === 'admin'
	);
</script>

<svelte:head>
	<title>Convites — Finance</title>
</svelte:head>

<div class="flex flex-col gap-6">
	{#if canManage}
		<form method="POST" action="?/create" class="flex flex-wrap items-end gap-3" use:enhance>
			<div class="grid min-w-64 flex-1 gap-2">
				<Label for="emailOrPhone">E-mail ou telefone</Label>
				<Input
					id="emailOrPhone"
					name="emailOrPhone"
					value={form?.emailOrPhone ?? ''}
					placeholder="pessoa@exemplo.com"
					required
				/>
			</div>
			<div class="grid gap-2">
				<Label for="role">Papel</Label>
				<select
					id="role"
					name="role"
					class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<option value="member">Membro</option>
					<option value="admin">Admin</option>
					<option value="viewer">Visualização</option>
				</select>
			</div>
			<Button type="submit">Convidar</Button>
		</form>
	{/if}

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		{#each data.invites as invite (invite.id)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				<div class="min-w-0">
					<p class="truncate text-sm font-medium">{invite.emailOrPhone}</p>
					<p class="text-sm text-muted-foreground">
						{invite.role} • expira em {formatDate(invite.expiresAt)}
					</p>
				</div>
				{#if canManage}
					<form method="POST" action="?/revoke" use:enhance>
						<input type="hidden" name="inviteId" value={invite.id} />
						<Button type="submit" variant="outline" size="sm">Revogar</Button>
					</form>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum convite pendente.</p>
		{/each}
	</div>
</div>
