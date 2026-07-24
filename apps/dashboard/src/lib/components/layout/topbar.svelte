<script lang="ts">
	import SignOut from 'phosphor-svelte/lib/SignOut';

	import { enhance } from '$app/forms';

	import WorkspaceSwitcher from '$lib/components/layout/workspace-switcher.svelte';
	import type { SessionUser } from '$lib/server/auth-api';
	import type { WorkspaceSummary } from '$lib/server/workspace-api';

	let {
		user,
		workspaces,
		activeWorkspace
	}: {
		user: SessionUser;
		workspaces: WorkspaceSummary[];
		activeWorkspace: WorkspaceSummary | null;
	} = $props();
</script>

<header
	class="flex items-center justify-between gap-2 border-b border-foreground/10 px-3 py-3 sm:px-6"
>
	<WorkspaceSwitcher {workspaces} {activeWorkspace} />
	<div class="flex items-center gap-2 sm:gap-4">
		<span class="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
		<form method="POST" action="/logout" use:enhance>
			<button
				type="submit"
				class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
			>
				<SignOut size={16} />
				Sair
			</button>
		</form>
	</div>
</header>
