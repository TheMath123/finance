<script lang="ts">
	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Guardrails de IA — Admin</title>
</svelte:head>

<div class="mx-auto flex max-w-lg flex-col gap-6">
	<h1 class="text-xl font-semibold">Guardrails de IA</h1>

	<Card class="flex-col gap-4 p-4">
		<div>
			<p class="text-sm font-medium">Orçamento diário de tokens por usuário</p>
			<p class="text-sm text-muted-foreground">
				Quando um usuário atinge esse limite num dia, o pipeline de IA do WhatsApp cai pro fallback
				determinístico (sem custo) até o dia seguinte. Mudanças refletem em até 30s, sem precisar
				reiniciar o backend.
			</p>
		</div>

		{#if form?.message}
			<p class="text-sm text-destructive">{form.message}</p>
		{/if}

		<form method="POST" action="?/update" class="flex items-end gap-2" use:enhance>
			<div class="grid gap-2">
				<Label for="dailyTokenBudgetPerUser">Tokens/dia</Label>
				<Input
					id="dailyTokenBudgetPerUser"
					name="dailyTokenBudgetPerUser"
					type="number"
					min="1"
					value={data.settings?.dailyTokenBudgetPerUser ?? ''}
					required
				/>
			</div>
			<Button type="submit">Salvar</Button>
		</form>

		{#if data.settings}
			<p class="text-xs text-muted-foreground">
				Última atualização: {new Date(data.settings.updatedAt).toLocaleString('pt-BR')}
			</p>
		{/if}
	</Card>
</div>
