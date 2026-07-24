<script lang="ts">
	import Bank from 'phosphor-svelte/lib/Bank';
	import CreditCard from 'phosphor-svelte/lib/CreditCard';
	import House from 'phosphor-svelte/lib/House';
	import UsersThree from 'phosphor-svelte/lib/UsersThree';
	import Wallet from 'phosphor-svelte/lib/Wallet';

	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const homeActive = $derived(page.url.pathname === resolve('/'));
	const banksActive = $derived(page.url.pathname.startsWith('/banks'));
	const accountsActive = $derived(page.url.pathname.startsWith('/accounts'));
	const cardsActive = $derived(page.url.pathname.startsWith('/cards'));
	const workspaceActive = $derived(page.url.pathname.startsWith('/workspace'));
</script>

<!--
	Flat, sem sombra, divisor sutil — linguagem do Figma (mesma do app mobile).
	Em tela pequena (spec: dashboard também atende quem não usa o app) vira um
	trilho só de ícones; os rótulos aparecem a partir de sm.
-->
<aside
	class="flex w-14 shrink-0 flex-col gap-1 border-r border-foreground/10 bg-sidebar p-2 sm:w-56 sm:p-4"
>
	<p class="mb-4 hidden px-3 text-lg font-semibold text-sidebar-foreground sm:block">Finance</p>

	<a
		href={resolve('/')}
		title="Início"
		class="flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors sm:justify-start {homeActive
			? 'bg-primary font-medium text-primary-foreground'
			: 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'}"
	>
		<House size={18} weight={homeActive ? 'fill' : 'regular'} />
		<span class="hidden sm:inline">Início</span>
	</a>

	<a
		href={resolve('/banks')}
		title="Bancos"
		class="flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors sm:justify-start {banksActive
			? 'bg-primary font-medium text-primary-foreground'
			: 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'}"
	>
		<Bank size={18} weight={banksActive ? 'fill' : 'regular'} />
		<span class="hidden sm:inline">Bancos</span>
	</a>

	<a
		href={resolve('/accounts')}
		title="Contas"
		class="flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors sm:justify-start {accountsActive
			? 'bg-primary font-medium text-primary-foreground'
			: 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'}"
	>
		<Wallet size={18} weight={accountsActive ? 'fill' : 'regular'} />
		<span class="hidden sm:inline">Contas</span>
	</a>

	<a
		href={resolve('/cards')}
		title="Cartões"
		class="flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors sm:justify-start {cardsActive
			? 'bg-primary font-medium text-primary-foreground'
			: 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'}"
	>
		<CreditCard size={18} weight={cardsActive ? 'fill' : 'regular'} />
		<span class="hidden sm:inline">Cartões</span>
	</a>

	<a
		href={resolve('/workspace')}
		title="Workspace"
		class="flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors sm:justify-start {workspaceActive
			? 'bg-primary font-medium text-primary-foreground'
			: 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'}"
	>
		<UsersThree size={18} weight={workspaceActive ? 'fill' : 'regular'} />
		<span class="hidden sm:inline">Workspace</span>
	</a>
</aside>
