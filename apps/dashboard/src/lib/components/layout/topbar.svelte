<script lang="ts">
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
	<!-- "Sair" mora em Workspace > Configurações agora — nada de ação destrutiva solta no topo. -->
	<span class="hidden shrink-0 text-sm text-muted-foreground sm:inline">{user.name}</span>
</header>
