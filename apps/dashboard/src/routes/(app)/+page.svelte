<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard — Finance</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
	<header class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Finance</h1>
		<form method="POST" action="/logout" use:enhance>
			<Button type="submit" variant="outline" size="sm">Sair</Button>
		</form>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>Olá, {data.user.name}</Card.Title>
			<Card.Description>
				Login funcionando — as telas do dashboard chegam nas próximas tasks do M4.
			</Card.Description>
		</Card.Header>
	</Card.Root>
</div>
