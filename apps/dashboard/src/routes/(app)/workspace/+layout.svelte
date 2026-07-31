<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children } = $props();

	// resolve() inline no template (regra svelte/no-navigation-without-resolve).
	// "Convites" foi absorvida na aba Membros; "Meus convites" só é acessada via
	// clique na notificação de convite (notificationTargetRoute), sem aba própria.
	const TABS = [
		{ route: '/workspace/members', label: 'Membros' },
		{ route: '/workspace/activity', label: 'Atividade' },
		{ route: '/workspace/plan', label: 'Assinatura' },
		{ route: '/workspace/settings', label: 'Configurações' }
	] as const;
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<h1 class="text-xl font-semibold">Workspace</h1>

	<!-- Abas em pílula translúcida — mesma linguagem dos chips do Figma. -->
	<nav class="flex flex-wrap gap-2">
		{#each TABS as tab (tab.route)}
			{@const active = page.url.pathname === resolve(tab.route)}
			<a
				href={resolve(tab.route)}
				class="rounded-lg px-3 py-1.5 text-sm transition-colors {active
					? 'bg-primary font-medium text-primary-foreground'
					: 'bg-primary/10 text-primary hover:bg-primary/20'}"
			>
				{tab.label}
			</a>
		{/each}
	</nav>

	{@render children()}
</div>
