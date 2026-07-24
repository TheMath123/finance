<script lang="ts">
	import Sidebar from '$lib/components/layout/sidebar.svelte';
	import Topbar from '$lib/components/layout/topbar.svelte';

	let { data, children } = $props();
</script>

<div class="flex min-h-screen">
	<Sidebar />
	<div class="flex min-w-0 flex-1 flex-col">
		<Topbar user={data.user} workspaces={data.workspaces} activeWorkspace={data.activeWorkspace} />
		<!-- pb-20: espaço pra barra de abas fixa no rodapé em mobile (ver sidebar.svelte). -->
		<main class="flex-1 overflow-x-hidden p-3 pb-20 sm:p-6 sm:pb-6">
			{@render children()}
		</main>
	</div>
</div>
