<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import { formatDate } from '$lib/format';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Meus convites — Marcelus</title>
</svelte:head>

<div class="flex flex-col gap-6">
	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		{#each data.myInvites as invite (invite.id)}
			<div class="flex items-center justify-between gap-4 border-t border-foreground/10 px-2 py-4">
				<div class="min-w-0">
					<p class="truncate text-sm font-medium">{invite.workspaceName}</p>
					<p class="text-sm text-muted-foreground">
						Convidado por {invite.inviterName} como {invite.role} • expira em
						{formatDate(invite.expiresAt)}
					</p>
				</div>
				<form method="POST" action="?/accept" use:enhance>
					<input type="hidden" name="inviteId" value={invite.id} />
					<Button type="submit" size="sm">Aceitar</Button>
				</form>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhum convite pendente pra você.</p>
		{/each}
	</div>
</div>
