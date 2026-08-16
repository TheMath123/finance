<!--
	Skeleton dos cards de planos, mostrado só durante a navegação client-side
	pra /pricing (ver [lang=lang]/+layout.svelte, checagem de `navigating`) —
	evita Layout Shift enquanto o load() da rota busca os planos reais na API
	(pedido explícito da especificação de conteúdo, seção "Diretrizes para a
	Seção de Preços"). Mantém o mesmo shape/hairline do grid real
	(pricing/+page.svelte) pra não pular quando o conteúdo de verdade chegar.
-->
<section class="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center sm:pt-32">
	<div class="mx-auto h-10 w-80 max-w-full animate-pulse bg-muted"></div>
	<div class="mx-auto mt-5 h-5 w-64 max-w-full animate-pulse bg-muted"></div>
</section>

<section class="mx-auto max-w-5xl px-6 pb-28">
	<div class="mb-12 flex justify-center">
		<div class="h-11 w-full max-w-md animate-pulse border border-border sm:w-72"></div>
	</div>

	<div class="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
		{#each [0, 1, 2] as i (i)}
			<div class="flex animate-pulse flex-col gap-5 border border-border bg-background p-8">
				<div class="space-y-2">
					<div class="h-5 w-24 bg-muted"></div>
					<div class="h-4 w-40 bg-muted"></div>
				</div>
				<div class="h-4 w-full bg-muted"></div>
				<div class="mt-auto h-9 w-28 bg-muted"></div>
				<div class="h-11 w-full bg-muted"></div>
			</div>
		{/each}
	</div>
</section>
