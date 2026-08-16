<script lang="ts">
	import { enhance } from '$app/forms';

	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils.js';

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

	<form method="GET" class="flex gap-2">
		<Input
			type="search"
			name="q"
			value={data.search}
			placeholder="Buscar por título, descrição ou key"
		/>
		<Button type="submit">Buscar</Button>
	</form>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="flex flex-col gap-2">
		{#each data.flags as flag (flag.id)}
			<div
				class={cn(
					'flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-colors',
					flag.enabled
						? 'border-emerald-500/25 bg-emerald-500/[0.07]'
						: 'border-foreground/10 bg-foreground/[0.03]'
				)}
			>
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<p class="truncate text-sm font-medium">{flag.title}</p>
						<span class="truncate font-mono text-xs text-muted-foreground">{flag.key}</span>
						{#if flag.isSystem}
							<Badge variant="outline">Sistema</Badge>
						{/if}
					</div>
					{#if flag.description}
						<p class="truncate text-sm text-muted-foreground">{flag.description}</p>
					{/if}
				</div>
				<div class="flex shrink-0 items-center gap-3">
					<!-- Status atual (independente do botão) — o card inteiro já carrega
					     o reforço visual (borda/fundo verde quando ativa, acinzentado
					     quando não); o texto aqui existe pra não depender só de cor. -->
					<span
						class={cn(
							'text-xs font-medium',
							flag.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
						)}
					>
						{flag.enabled ? 'Ativa' : 'Inativa'}
					</span>
					<form method="POST" action="?/toggle" use:enhance>
						<input type="hidden" name="key" value={flag.key} />
						<input type="hidden" name="enabled" value={(!flag.enabled).toString()} />
						<!-- Rótulo do botão é a AÇÃO que o clique vai fazer, não o estado
						     atual (que já é mostrado no indicador acima) — senão "Inativa"
						     lia como se clicar fosse desativar algo já desativado. -->
						<Button type="submit" variant={flag.enabled ? 'outline' : 'default'} size="sm">
							{flag.enabled ? 'Desativar' : 'Ativar'}
						</Button>
					</form>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Nenhuma feature flag cadastrada.</p>
		{/each}
	</div>
</div>
