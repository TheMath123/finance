<script lang="ts">
	import Sidebar from '$lib/components/layout/sidebar.svelte';
	import Topbar from '$lib/components/layout/topbar.svelte';

	let { data, children } = $props();
</script>

<!--
	App shell: a viewport nunca rola como um todo — só o <main> (corpo) tem
	scroll vertical. Sidebar ocupa a altura inteira e rola por conta própria
	se a navegação não couber; topbar rola horizontalmente se o conteúdo dela
	não couber (nunca quebra linha). Mesmo padrão em routes/saas/+layout.svelte.
-->
<div class="flex h-screen overflow-hidden">
	<Sidebar />
	<div class="flex min-w-0 flex-1 flex-col">
		<Topbar
			user={data.user}
			workspaces={data.workspaces}
			activeWorkspace={data.activeWorkspace}
			notifications={data.notifications}
		/>
		<!-- pb-20: espaço pra barra de abas fixa no rodapé em mobile (ver sidebar.svelte). -->
		<main class="flex-1 overflow-x-hidden overflow-y-auto p-3 pb-20 sm:p-6 sm:pb-6">
			{@render children()}
		</main>
	</div>
</div>
