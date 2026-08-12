<script lang="ts">
	import CreditCardIcon from 'phosphor-svelte/lib/CreditCardIcon';
	import ShieldCheckIcon from 'phosphor-svelte/lib/ShieldCheckIcon';
	import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon';

	import { resolve } from '$app/paths';

	import NotificationBell from '$lib/components/layout/notification-bell.svelte';
	import WorkspaceSwitcher from '$lib/components/layout/workspace-switcher.svelte';
	import type { SessionUser } from '$lib/server/auth-api';
	import type { NotificationView } from '$lib/server/notification-api';
	import type { WorkspaceSummary } from '$lib/server/workspace-api';

	let {
		user,
		workspaces,
		activeWorkspace,
		notifications
	}: {
		user: SessionUser;
		workspaces: WorkspaceSummary[];
		activeWorkspace: WorkspaceSummary | null;
		notifications: NotificationView[];
	} = $props();
</script>

<header
	class="flex shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-foreground/10 px-3 py-2 sm:px-6 sm:py-3"
>
	<div class="min-w-0 flex-1">
		<WorkspaceSwitcher {workspaces} {activeWorkspace} />
	</div>
	<div class="flex shrink-0 items-center gap-1">
		<a
			href={resolve('/workspace/plan')}
			class="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
		>
			<CreditCardIcon size={18} />
			<span class="hidden sm:inline">Plano</span>
		</a>
		<NotificationBell initial={notifications} />
		{#if user.platformRole === 'superadmin'}
			<a
				href={resolve('/saas')}
				class="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
			>
				<ShieldCheckIcon size={18} />
				<span class="hidden sm:inline">SaaS</span>
			</a>
		{/if}
		<a
			href={resolve('/account')}
			class="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
		>
			<UserCircleIcon size={18} />
			<span class="hidden sm:inline">{user.name}</span>
		</a>
	</div>
</header>
