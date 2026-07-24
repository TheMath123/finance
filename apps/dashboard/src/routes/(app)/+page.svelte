<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard — Finance</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<h1 class="text-xl font-semibold">Olá, {data.user.name}</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>{data.activeWorkspace?.name ?? 'Sem workspace'}</Card.Title>
			<Card.Description>
				Workspace ativo — as telas financeiras (contas, cartões, transações, resumo) chegam nas
				próximas tasks do M4.
			</Card.Description>
		</Card.Header>
	</Card.Root>
</div>
