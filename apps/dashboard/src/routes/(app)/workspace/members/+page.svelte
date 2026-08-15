<script lang="ts">
	import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon';

	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { formatDate } from '$lib/format';

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
	<title>Membros — Marcelus</title>
</svelte:head>

<div class="flex flex-col gap-6">
	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	{#if canManage}
		<form method="POST" action="?/invite" class="flex flex-wrap items-end gap-3" use:enhance>
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

		{#if data.invites.length > 0}
			<div>
				<p class="mb-2 text-sm font-medium text-muted-foreground">Convites pendentes</p>
				{#each data.invites as invite (invite.id)}
					<div
						class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4"
					>
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{invite.emailOrPhone}</p>
							<p class="text-sm text-muted-foreground">
								{invite.role} • expira em {formatDate(invite.expiresAt)}
							</p>
						</div>
						<form method="POST" action="?/revokeInvite" use:enhance>
							<input type="hidden" name="inviteId" value={invite.id} />
							<Button type="submit" variant="outline" size="sm">Revogar</Button>
						</form>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Linhas com divisor no topo, sem card — linguagem do Figma. -->
	<div>
		{#each data.members as member (member.userId)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				<div class="flex min-w-0 items-center gap-3">
					{#if member.avatarUrl}
						<img src={member.avatarUrl} alt="" class="h-9 w-9 shrink-0 rounded-full object-cover" />
					{:else}
						<UserCircleIcon size={36} class="shrink-0 text-muted-foreground" weight="light" />
					{/if}
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">{member.name}</p>
						<p class="truncate text-sm text-muted-foreground">{member.email}</p>
					</div>
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
