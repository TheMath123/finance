<script lang="ts">
	import House from 'phosphor-svelte/lib/House';
	import ReceiptIcon from 'phosphor-svelte/lib/Receipt';
	import RepeatIcon from 'phosphor-svelte/lib/RepeatIcon';
	import SquaresFour from 'phosphor-svelte/lib/SquaresFour';
	import UsersThree from 'phosphor-svelte/lib/UsersThree';

	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const NAV = [
		{ route: '/', label: 'Início', icon: House, match: (p: string) => p === resolve('/') },
		{
			route: '/transactions',
			label: 'Transações',
			icon: ReceiptIcon,
			match: (p: string) => p.startsWith('/transactions')
		},
		{
			route: '/recurring',
			label: 'Recorrências',
			icon: RepeatIcon,
			match: (p: string) => p.startsWith('/recurring')
		},
		{
			route: '/more',
			label: 'Mais',
			icon: SquaresFour,
			match: (p: string) => p.startsWith('/more')
		},
		{
			route: '/workspace',
			label: 'Workspace',
			icon: UsersThree,
			match: (p: string) => p.startsWith('/workspace')
		}
	] as const;
</script>

<!--
	Flat, sem sombra, divisor sutil — linguagem do Figma (mesma do app mobile).
	Desktop (sm+): trilho lateral com ícone+rótulo. Mobile: vira uma barra de
	abas fixa no rodapé (mesma convenção do app — nunca um rail espremido
	competindo por largura com o conteúdo numa tela de celular).
-->
<aside
	class="hidden h-full w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-foreground/10 bg-sidebar p-4 sm:flex"
>
	<div class="mb-4 flex items-center gap-2 px-3">
		<img src="/logo.svg" alt="" class="h-6 w-6 shrink-0" />
		<p class="text-lg font-semibold text-sidebar-foreground">Marcelus</p>
	</div>
	{#each NAV as item (item.route)}
		{@const active = item.match(page.url.pathname)}
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
</aside>

<nav
	class="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-foreground/10 bg-sidebar pb-[env(safe-area-inset-bottom)] sm:hidden"
>
	{#each NAV as item (item.route)}
		{@const active = item.match(page.url.pathname)}
		<a
			href={resolve(item.route)}
			class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs {active
				? 'font-medium text-primary'
				: 'text-muted-foreground'}"
		>
			<item.icon size={20} weight={active ? 'fill' : 'regular'} />
			{item.label}
		</a>
	{/each}
</nav>
