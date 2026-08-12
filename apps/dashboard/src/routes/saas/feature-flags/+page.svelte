<script lang="ts">
	import { enhance } from '$app/forms';

	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Feature flags — SaaS</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold">Feature flags</h1>
		<p class="text-sm text-muted-foreground">
			Flags são definidas em código (migration) — aqui só liga/desliga o que já existe.
		</p>
	</div>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="flex flex-col gap-2">
		{#each data.flags as flag (flag.id)}
			<div
				class="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 px-4 py-3"
			>
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<p class="truncate text-sm font-medium">{flag.key}</p>
						{#if flag.isSystem}
							<Badge variant="outline">Sistema</Badge>
						{/if}
					</div>
					{#if flag.description}
						<p class="truncate text-sm text-muted-foreground">{flag.description}</p>
					{/if}
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<form method="POST" action="?/toggle" use:enhance>
						<input type="hidden" name="key" value={flag.key} />
						<input type="hidden" name="enabled" value={(!flag.enabled).toString()} />
						<Button type="submit" variant={flag.enabled ? 'default' : 'outline'} size="sm">
							{flag.enabled ? 'Ativa' : 'Inativa'}
						</Button>
					</form>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhuma feature flag cadastrada.</p>
		{/each}
	</div>
</div>
