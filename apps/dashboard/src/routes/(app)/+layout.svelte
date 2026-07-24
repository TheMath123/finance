<script lang="ts">
	import Sidebar from '$lib/components/layout/sidebar.svelte';
	import Topbar from '$lib/components/layout/topbar.svelte';

	let { data, children } = $props();
</script>

<div class="flex min-h-screen">
	<Sidebar />
	<div class="flex min-w-0 flex-1 flex-col">
		<Topbar user={data.user} workspaces={data.workspaces} activeWorkspace={data.activeWorkspace} />
		<main class="flex-1 p-6">
			{@render children()}
		</main>
	</div>
</div>
