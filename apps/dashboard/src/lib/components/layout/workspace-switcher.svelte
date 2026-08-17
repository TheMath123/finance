<script lang="ts">
	import { tick } from 'svelte';

	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { Select } from '$lib/components/ui/select';
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

	const options = $derived([
		...workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name })),
		{ value: NEW_WORKSPACE, label: '+ Novo workspace' }
	]);

	// Writable $derived (Svelte 5): reflete `activeWorkspace` por padrão, mas
	// aceita reatribuição local (abaixo) até a próxima mudança de dependência.
	let selected = $derived(activeWorkspace?.id ?? '');

	let formEl = $state<HTMLFormElement>();

	/**
	 * Bug real em produção (auditoria 2026-08-17): requestSubmit() síncrono
	 * logo após `selected = value` submetia o valor ANTERIOR — o input hidden
	 * que o bits-ui usa pra participar do form nativo (select-hidden-input.svelte)
	 * reflete `value` via binding reativo do Svelte, que só chega no DOM no
	 * próximo flush, não na mesma linha síncrona. Resultado: quem tentava
	 * trocar pro workspace convidado sempre "trocava" de volta pro workspace
	 * pessoal (era o valor selecionado por padrão, então parecia nunca sair
	 * dele). `tick()` espera esse flush antes de submeter.
	 */
	async function handleChange(value: string) {
		if (value === NEW_WORKSPACE) {
			selected = activeWorkspace?.id ?? '';
			void goto(resolve('/workspace/new'));
			return;
		}
		selected = value;
		await tick();
		formEl?.requestSubmit();
	}
</script>

<!-- Pílula translúcida teal — mesma linguagem do seletor de workspace do app (Figma). -->
<form method="POST" action="/workspace/switch" use:enhance bind:this={formEl} class="max-w-full">
	<Select
		name="workspaceId"
		{options}
		value={selected}
		onValueChange={handleChange}
		class="w-full max-w-56 truncate border-0 bg-primary/10 font-medium text-primary hover:bg-primary/10"
	/>
</form>
