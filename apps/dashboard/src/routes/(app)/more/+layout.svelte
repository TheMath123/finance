<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { data, children } = $props();

	// resolve() inline no template (regra svelte/no-navigation-without-resolve).
	// Mesmo agrupamento da aba "Mais" do app mobile. `as const` em cada branch
	// (não no ternário todo) — senão o spread condicional larga pra `string`
	// e `resolve()` (rotas tipadas) para de aceitar `tab.route`.
	const TABS = $derived(
		data.categoriesManagementEnabled
			? ([
					{ route: '/more/accounts', label: 'Contas' },
					{ route: '/more/cards', label: 'Cartões' },
					{ route: '/more/banks', label: 'Bancos' },
					{ route: '/more/categories', label: 'Categorias' },
					{ route: '/more/transfers', label: 'Transferências' },
					{ route: '/more/splits', label: 'Splits' },
					{ route: '/more/variable-expense', label: 'Gasto variável' }
				] as const)
			: ([
					{ route: '/more/accounts', label: 'Contas' },
					{ route: '/more/cards', label: 'Cartões' },
					{ route: '/more/banks', label: 'Bancos' },
					{ route: '/more/transfers', label: 'Transferências' },
					{ route: '/more/splits', label: 'Splits' },
					{ route: '/more/variable-expense', label: 'Gasto variável' }
				] as const)
	);
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-6">
	<h1 class="text-xl font-semibold">Mais</h1>

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
