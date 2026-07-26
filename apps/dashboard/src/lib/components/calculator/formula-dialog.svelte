<script lang="ts">
	import { evaluateFormula } from '@finance/formula';

	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { FormulaVariableValue } from '$lib/formula-catalog';
	import { formatCents } from '$lib/money';
	import type { SavedFormulaView } from '$lib/server/formula-api';

	let {
		open = $bindable(false),
		variables,
		values,
		formulas
	}: {
		open: boolean;
		variables: FormulaVariableValue[];
		values: Record<string, number>;
		formulas: SavedFormulaView[];
	} = $props();

	let editing = $state<SavedFormulaView | null>(null);
	let name = $state('');
	let expression = $state('');
	let displayFormat = $state<'currency' | 'number'>('currency');
	let pinnedTo = $state<'none' | 'home' | 'transactions'>('none');

	/** Primeiro elemento arrastável do codebase — pointer events manuais, sem lib nova. */
	let dragOffset = $state({ x: 0, y: 0 });
	let dragging = false;
	let dragStart = { x: 0, y: 0, offsetX: 0, offsetY: 0 };

	function startDrag(event: PointerEvent) {
		dragging = true;
		dragStart = {
			x: event.clientX,
			y: event.clientY,
			offsetX: dragOffset.x,
			offsetY: dragOffset.y
		};
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function onDrag(event: PointerEvent) {
		if (!dragging) return;
		dragOffset = {
			x: dragStart.offsetX + (event.clientX - dragStart.x),
			y: dragStart.offsetY + (event.clientY - dragStart.y)
		};
	}
	function stopDrag() {
		dragging = false;
	}

	function resetForm() {
		editing = null;
		name = '';
		expression = '';
		displayFormat = 'currency';
		pinnedTo = 'none';
	}

	function startCreate() {
		resetForm();
	}

	function startEdit(formula: SavedFormulaView) {
		editing = formula;
		name = formula.name;
		expression = formula.expression;
		displayFormat = formula.displayFormat;
		pinnedTo = formula.pinnedTo;
	}

	function insertToken(token: string) {
		expression = expression.trim() ? `${expression.trim()} ${token}` : token;
	}

	const preview = $derived.by(() => {
		if (!expression.trim()) return null;
		return evaluateFormula(expression, values);
	});

	/** Reseta o formulário só quando a action salva/edita com sucesso; excluir só recarrega a lista. */
	function afterSubmit({ resetOnSuccess }: { resetOnSuccess: boolean }) {
		return async ({
			result,
			update
		}: {
			result: { type: string };
			update: () => Promise<void>;
		}) => {
			if (resetOnSuccess && result.type === 'success') resetForm();
			await update();
		};
	}
</script>

<Dialog.Root
	{open}
	onOpenChange={(next) => {
		open = next;
		if (!next) resetForm();
	}}
>
	<Dialog.Content
		style="transform: translate(calc(-50% + {dragOffset.x}px), calc(-50% + {dragOffset.y}px))"
		class="max-w-lg"
	>
		<div
			class="-m-4 mb-0 flex cursor-grab items-center justify-between rounded-t-xl border-b border-foreground/10 p-4 active:cursor-grabbing"
			role="button"
			tabindex="0"
			aria-label="Arraste para mover a calculadora"
			onpointerdown={startDrag}
			onpointermove={onDrag}
			onpointerup={stopDrag}
			onpointercancel={stopDrag}
		>
			<Dialog.Title>Calculadora de fórmulas</Dialog.Title>
		</div>

		{#if formulas.length > 0}
			<div class="flex flex-col gap-1">
				<p class="text-xs font-medium text-muted-foreground">Fórmulas salvas</p>
				{#each formulas as formula (formula.id)}
					<div
						class="flex items-center justify-between gap-2 rounded-lg border border-foreground/10 px-3 py-2 text-sm"
					>
						<span class="truncate">{formula.name}</span>
						<div class="flex shrink-0 items-center gap-1">
							<Button type="button" variant="ghost" size="sm" onclick={() => startEdit(formula)}>
								Editar
							</Button>
							<form
								method="POST"
								action="?/deleteFormula"
								use:enhance={() => afterSubmit({ resetOnSuccess: false })}
							>
								<input type="hidden" name="formulaId" value={formula.id} />
								<Button type="submit" variant="ghost" size="sm" class="text-destructive">
									Excluir
								</Button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<form
			method="POST"
			action={editing ? '?/updateFormula' : '?/createFormula'}
			use:enhance={() => afterSubmit({ resetOnSuccess: true })}
			class="flex flex-col gap-3"
		>
			{#if editing}
				<input type="hidden" name="formulaId" value={editing.id} />
			{/if}

			<div class="grid gap-2">
				<Label for="formula-name">Nome</Label>
				<Input id="formula-name" name="name" bind:value={name} required maxlength={80} />
			</div>

			<div class="grid gap-2">
				<Label for="formula-expression">Fórmula</Label>
				<Input
					id="formula-expression"
					name="expression"
					bind:value={expression}
					required
					placeholder="ex.: despesas - receitas"
				/>
			</div>

			<div class="flex flex-wrap gap-1.5">
				{#each variables as variable (variable.token)}
					<button
						type="button"
						class="rounded-full border border-foreground/10 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
						title={variable.description}
						onclick={() => insertToken(variable.token)}
					>
						{variable.label}
					</button>
				{/each}
			</div>

			{#if preview}
				<p class="text-sm text-muted-foreground">
					Resultado:
					<span class="font-medium text-foreground">
						{#if preview.ok}
							{displayFormat === 'currency' ? formatCents(preview.value) : preview.value}
						{:else}
							—
						{/if}
					</span>
				</p>
			{/if}

			<div class="grid grid-cols-2 gap-3">
				<div class="grid gap-2">
					<Label for="formula-display-format">Formato</Label>
					<select
						id="formula-display-format"
						name="displayFormat"
						bind:value={displayFormat}
						class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="currency">Moeda</option>
						<option value="number">Número</option>
					</select>
				</div>
				<div class="grid gap-2">
					<Label for="formula-pinned-to">Fixar em</Label>
					<select
						id="formula-pinned-to"
						name="pinnedTo"
						bind:value={pinnedTo}
						class="h-9 rounded-lg border border-foreground/10 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="none">Nenhum</option>
						<option value="home">Início</option>
						<option value="transactions">Transações</option>
					</select>
				</div>
			</div>

			<Dialog.Footer>
				{#if editing}
					<Button type="button" variant="outline" onclick={startCreate}>Cancelar edição</Button>
				{/if}
				<Button type="submit">{editing ? 'Salvar alterações' : 'Salvar fórmula'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
