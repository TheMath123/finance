<script lang="ts">
	import { resolve } from '$app/paths';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	let { data } = $props();
</script>

<svelte:head>
	<title>Confirmar e-mail — Marcelus</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>{data.success ? 'E-mail confirmado!' : 'Não foi possível confirmar'}</Card.Title>
			<Card.Description>
				{data.success
					? 'Seu e-mail foi verificado com sucesso.'
					: data.message}
			</Card.Description>
		</Card.Header>
		<Card.Footer>
			<Button href={resolve('/login')} class="w-full">Ir para o login</Button>
		</Card.Footer>
	</Card.Root>
</div>
