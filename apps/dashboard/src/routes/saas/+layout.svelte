<script lang="ts">
	import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon';
	import ChartBarIcon from 'phosphor-svelte/lib/ChartBarIcon';
	import FlagIcon from 'phosphor-svelte/lib/FlagIcon';
	import SparkleIcon from 'phosphor-svelte/lib/SparkleIcon';
	import TagIcon from 'phosphor-svelte/lib/TagIcon';
	import UsersIcon from 'phosphor-svelte/lib/UsersIcon';

	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { data, children } = $props();

	const NAV = [
		{ route: '/saas/users', label: 'Usuários', icon: UsersIcon },
		{ route: '/saas/default-categories', label: 'Categorias padrão', icon: TagIcon },
		{ route: '/saas/ai-settings', label: 'Guardrails de IA', icon: SparkleIcon },
		{ route: '/saas/feature-flags', label: 'Feature flags', icon: FlagIcon },
		{ route: '/saas/metrics', label: 'Métricas', icon: ChartBarIcon }
	] as const;
</script>

<svelte:head>
	<title>SaaS — Finance</title>
</svelte:head>

<div class="flex min-h-screen">
	<aside
		class="hidden w-56 shrink-0 flex-col gap-1 border-r border-foreground/10 bg-sidebar p-4 sm:flex"
	>
		<p class="mb-1 px-3 text-lg font-semibold text-sidebar-foreground">SaaS</p>
		<p class="mb-4 truncate px-3 text-xs text-muted-foreground">{data.user.name}</p>

		{#each NAV as item (item.route)}
			{@const active = page.url.pathname === resolve(item.route)}
			<a
				href={resolve(item.route)}
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors {active
					? 'bg-primary font-medium text-primary-foreground'
					: 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'}"
			>
				<item.icon size={18} weight={active ? 'fill' : 'regular'} />
				{item.label}
			</a>
		{/each}

		<a
			href={resolve('/')}
			class="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
		>
			<ArrowLeftIcon size={18} />
			Voltar ao dashboard
		</a>
	</aside>

	<main class="flex-1 p-4 sm:p-8">
		{@render children()}
	</main>
</div>
