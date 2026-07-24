<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import type { WorkspaceSummary } from '$lib/server/workspace-api';

	let {
		workspaces,
		activeWorkspace
	}: {
		workspaces: WorkspaceSummary[];
		activeWorkspace: WorkspaceSummary | null;
	} = $props();

	// Sentinela da última opção — navega pro form de criação em vez de trocar
	// de workspace (e devolve o select pro valor atual, senão ele fica preso
	// em "+ Novo workspace" ao voltar).
	const NEW_WORKSPACE = '__new__';

	function handleChange(event: Event & { currentTarget: HTMLSelectElement }) {
		if (event.currentTarget.value === NEW_WORKSPACE) {
			event.currentTarget.value = activeWorkspace?.id ?? '';
			void goto(resolve('/workspace/new'));
			return;
		}
		event.currentTarget.form?.requestSubmit();
	}
</script>

<!-- Pílula translúcida teal — mesma linguagem do seletor de workspace do app (Figma). -->
<form method="POST" action="/workspace/switch" use:enhance>
	<select
		name="workspaceId"
		value={activeWorkspace?.id}
		onchange={handleChange}
		class="cursor-pointer rounded-lg border-0 bg-primary/10 px-4 py-2 text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
	>
		{#each workspaces as workspace (workspace.id)}
			<option value={workspace.id}>{workspace.name}</option>
		{/each}
		<option value={NEW_WORKSPACE}>+ Novo workspace</option>
	</select>
</form>
