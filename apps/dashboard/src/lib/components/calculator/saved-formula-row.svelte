<script lang="ts">
	import PushPinIcon from 'phosphor-svelte/lib/PushPinIcon';

	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { Switch } from '$lib/components/ui/switch';
	import type { SavedFormulaView } from '$lib/server/formula-api';

	let {
		formula,
		onEdit
	}: {
		formula: SavedFormulaView;
		onEdit: (formula: SavedFormulaView) => void;
	} = $props();

	const pinned = $derived(formula.pinnedHome || formula.pinnedTransactions);

	/**
	 * Toggle direto pelo pin, sem passar pelo form de edição — usa `fetch` puro
	 * (não um <form> com hidden inputs) porque só precisamos do valor que já
	 * está em mãos no clique, sem depender do ciclo de reatividade do DOM
	 * terminar antes do submit.
	 */
	async function togglePin(field: 'pinnedHome' | 'pinnedTransactions', value: boolean) {
		const body = new URLSearchParams({
			formulaId: formula.id,
			pinnedHome: String(field === 'pinnedHome' ? value : formula.pinnedHome),
			pinnedTransactions: String(
				field === 'pinnedTransactions' ? value : formula.pinnedTransactions
			)
		});
		await fetch('?/pinFormula', { method: 'POST', body });
		await invalidateAll();
	}
</script>

<div
	class="flex items-center justify-between gap-2 rounded-lg border border-foreground/10 px-3 py-2 text-sm"
>
	<span class="truncate">{formula.name}</span>
	<div class="flex shrink-0 items-center gap-1">
		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						type="button"
						variant="ghost"
						size="icon-sm"
						title="Fixar como widget"
						aria-label="Fixar como widget"
						class={pinned ? 'text-primary' : 'text-muted-foreground'}
					>
						<PushPinIcon size={16} weight={pinned ? 'fill' : 'regular'} />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-52" align="end">
				<p class="px-1 pb-1 text-xs font-medium text-muted-foreground">Fixar como widget em</p>
				<label
					for="pin-home-{formula.id}"
					class="flex cursor-pointer items-center justify-between rounded-md px-1 py-1.5 text-sm hover:bg-muted/50"
				>
					Início
					<Switch
						id="pin-home-{formula.id}"
						checked={formula.pinnedHome}
						onCheckedChange={(v) => togglePin('pinnedHome', v)}
					/>
				</label>
				<label
					for="pin-transactions-{formula.id}"
					class="flex cursor-pointer items-center justify-between rounded-md px-1 py-1.5 text-sm hover:bg-muted/50"
				>
					Transações
					<Switch
						id="pin-transactions-{formula.id}"
						checked={formula.pinnedTransactions}
						onCheckedChange={(v) => togglePin('pinnedTransactions', v)}
					/>
				</label>
			</Popover.Content>
		</Popover.Root>
		<Button type="button" variant="ghost" size="sm" onclick={() => onEdit(formula)}>Editar</Button>
		<form
			method="POST"
			action="?/deleteFormula"
			use:enhance={() =>
				async ({ update }: { update: () => Promise<void> }) => {
					await update();
					await invalidateAll();
				}}
		>
			<input type="hidden" name="formulaId" value={formula.id} />
			<Button type="submit" variant="ghost" size="sm" class="text-destructive">Excluir</Button>
		</form>
	</div>
</div>
