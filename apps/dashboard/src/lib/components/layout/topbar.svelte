<script lang="ts">
	import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon';

	import { resolve } from '$app/paths';

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
	class="flex items-center justify-between gap-2 border-b border-foreground/10 px-3 py-2 sm:px-6 sm:py-3"
>
	<div class="min-w-0 flex-1">
		<WorkspaceSwitcher {workspaces} {activeWorkspace} />
	</div>
	<a
		href={resolve('/account')}
		class="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
	>
		<UserCircleIcon size={18} />
		<span class="hidden sm:inline">{user.name}</span>
	</a>
</header>
