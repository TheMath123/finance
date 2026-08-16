<script lang="ts">
	import CheckCircleIcon from 'phosphor-svelte/lib/CheckCircleIcon';
	import type { HeroMockup } from '$lib/i18n/messages';

	let { t }: { t: HeroMockup } = $props();
</script>

<!--
	Mockup ilustrativo (não é screenshot real) do painel web + do chat do
	WhatsApp — pedido explícito da especificação de conteúdo ("layout split
	screen: celular com WhatsApp ao lado de notebook com o Dashboard").
	Construído em HTML/CSS puro, no mesmo vocabulário visual do resto do site
	(ângulos retos, hairline, sem sombra decorativa/gradiente) — nenhuma
	imagem externa. Decorativo/ilustrativo, sem conteúdo próprio novo além do
	que já está no texto da página — escondido de leitores de tela.
-->
<div aria-hidden="true" class="relative mx-auto w-full max-w-md pb-10 lg:max-w-none lg:pb-14">
	<!-- "Notebook" com o painel web -->
	<div class="border border-border bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]">
		<div class="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
			<span class="h-1.5 w-1.5 border border-muted-foreground/40"></span>
			<span class="h-1.5 w-1.5 border border-muted-foreground/40"></span>
			<span class="h-1.5 w-1.5 border border-muted-foreground/40"></span>
		</div>
		<div class="space-y-5 p-6 sm:p-8">
			<p class="text-xs tracking-wide text-muted-foreground uppercase">{t.dashboardLabel}</p>
			<p class="font-display text-4xl tracking-tight sm:text-5xl">{t.dashboardValue}</p>
			<div>
				{#each t.dashboardRows as row, i (row)}
					<div class="flex items-center gap-3 border-t border-border py-3 text-sm first:border-t-0">
						{#if i === 0}
							<span class="h-1.5 w-1.5 shrink-0 bg-success"></span>
						{:else}
							<span class="h-1.5 w-1.5 shrink-0 border border-muted-foreground/50"></span>
						{/if}
						<span class="text-foreground">{row}</span>
					</div>
				{/each}
			</div>
		</div>
		<div class="h-2 border-t border-border bg-muted"></div>
	</div>

	<!-- "Celular" com a conversa do WhatsApp, sobreposto -->
	<div
		class="absolute -right-2 -bottom-10 w-36 border border-border bg-background shadow-[0_20px_45px_-18px_rgba(0,0,0,0.4)] sm:-right-6 sm:-bottom-14 sm:w-48"
	>
		<div class="border-b border-border px-3 py-2">
			<span class="mx-auto block h-1 w-8 bg-muted-foreground/30"></span>
		</div>
		<div class="flex flex-col gap-2 p-3">
			<p class="ml-auto max-w-[85%] bg-foreground px-3 py-2 text-[11px] text-background sm:text-xs">
				{t.chatUser}
			</p>
			<div
				class="mr-auto max-w-[85%] border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] sm:text-xs"
			>
				<div class="flex items-center gap-1 text-primary">
					<CheckCircleIcon size={12} weight="bold" />
					<span class="font-medium">{t.chatCategory}</span>
				</div>
				<div class="mt-1 flex items-center justify-between gap-2 text-muted-foreground">
					<span>{t.chatWhen}</span>
					<span class="font-medium text-foreground">{t.chatAmount}</span>
				</div>
			</div>
		</div>
	</div>
</div>
