<script lang="ts">
	import { evaluateFormula } from '@finance/formula';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import BackspaceIcon from 'phosphor-svelte/lib/BackspaceIcon';
	import XIcon from 'phosphor-svelte/lib/X';

	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { FormulaVariableValue } from '$lib/formula-catalog';
	import { formatReais } from '$lib/money';
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
	/** Referência ao card pra limitar o arraste (evita jogar o cabeçalho pra fora da tela e ficar sem como pegar de volta). */
	let contentEl = $state<HTMLElement | null>(null);

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
		let nextX = dragStart.offsetX + (event.clientX - dragStart.x);
		let nextY = dragStart.offsetY + (event.clientY - dragStart.y);

		if (contentEl) {
			const rect = contentEl.getBoundingClientRect();
			const halfW = rect.width / 2;
			const halfH = rect.height / 2;
			/** Sempre deixa pelo menos essa faixa do card visível — dá pra pegar o cabeçalho de novo mesmo no limite. */
			const margin = 48;
			const maxX = window.innerWidth / 2 - margin + halfW;
			const minX = margin - window.innerWidth / 2 - halfW;
			const maxY = window.innerHeight / 2 - margin + halfH;
			const minY = margin - window.innerHeight / 2 - halfH;
			nextX = Math.min(maxX, Math.max(minX, nextX));
			nextY = Math.min(maxY, Math.max(minY, nextY));
		}

		dragOffset = { x: nextX, y: nextY };
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
		/** Sem isso, reabrir o dialog reaparecia exatamente de onde foi arrastado da última vez — inclusive fora da tela. */
		dragOffset = { x: 0, y: 0 };
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

	/** Variáveis são identificadores inteiros — precisam de espaço antes pra não colar num token anterior. */
	function insertVariable(token: string) {
		expression = expression.trim() ? `${expression.trim()} ${token} ` : `${token} `;
	}

	/** Dígitos/operadores do teclado colam direto, sem espaço — comportamento normal de calculadora. */
	function appendKey(key: string) {
		expression += key;
	}

	function backspace() {
		expression = expression.slice(0, -1);
	}

	function clearAll() {
		expression = '';
	}

	const preview = $derived.by(() => {
		if (!expression.trim()) return null;
		return evaluateFormula(expression, values);
	});

	type KeypadKey = {
		label: string;
		action: 'clear' | 'backspace' | 'insert';
		key?: string;
		kind: 'action' | 'operator' | 'digit';
		span?: number;
	};

	/** Grid de 4 colunas — "0" ocupa 2 células, fechando 5 linhas certinhas. */
	const KEYPAD_KEYS: KeypadKey[] = [
		{ label: 'C', action: 'clear', kind: 'action' },
		{ label: '(', action: 'insert', key: '(', kind: 'operator' },
		{ label: ')', action: 'insert', key: ')', kind: 'operator' },
		{ label: '⌫', action: 'backspace', kind: 'action' },
		{ label: '÷', action: 'insert', key: '/', kind: 'operator' },
		{ label: '7', action: 'insert', key: '7', kind: 'digit' },
		{ label: '8', action: 'insert', key: '8', kind: 'digit' },
		{ label: '9', action: 'insert', key: '9', kind: 'digit' },
		{ label: '×', action: 'insert', key: '*', kind: 'operator' },
		{ label: '4', action: 'insert', key: '4', kind: 'digit' },
		{ label: '5', action: 'insert', key: '5', kind: 'digit' },
		{ label: '6', action: 'insert', key: '6', kind: 'digit' },
		{ label: '−', action: 'insert', key: '-', kind: 'operator' },
		{ label: '1', action: 'insert', key: '1', kind: 'digit' },
		{ label: '2', action: 'insert', key: '2', kind: 'digit' },
		{ label: '3', action: 'insert', key: '3', kind: 'digit' },
		{ label: '+', action: 'insert', key: '+', kind: 'operator' },
		{ label: '0', action: 'insert', key: '0', kind: 'digit', span: 2 },
		{ label: ',', action: 'insert', key: '.', kind: 'digit' },
	];

	function pressKey(k: KeypadKey) {
		if (k.action === 'clear') clearAll();
		else if (k.action === 'backspace') backspace();
		else if (k.key) appendKey(k.key);
	}

	const KEY_STYLES: Record<KeypadKey['kind'], string> = {
		action: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
		operator: 'bg-primary/10 text-primary hover:bg-primary/20',
		digit: 'bg-muted text-foreground hover:bg-muted/70'
	};

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

<DialogPrimitive.Root
	{open}
	onOpenChange={(next) => {
		open = next;
		if (!next) resetForm();
	}}
>
	<DialogPrimitive.Portal>
		<!-- Overlay próprio (sem blur) só pra este dialog — o backdrop-blur do dialog
		     padrão borra as cores da página atrás e cria um banho azulado; aqui é só
		     um véu neutro. -->
		<DialogPrimitive.Overlay
			class="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
		/>
		<DialogPrimitive.Content
			bind:ref={contentEl}
			style="transform: translate(calc(-50% + {dragOffset.x}px), calc(-50% + {dragOffset.y}px))"
			class="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
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
			<DialogPrimitive.Close>
				{#snippet child({ props })}
					<Button variant="ghost" class="absolute top-2 right-2" size="icon-sm" {...props}>
						<XIcon />
						<span class="sr-only">Fechar</span>
					</Button>
				{/snippet}
			</DialogPrimitive.Close>

			<form
				method="POST"
				action={editing ? '?/updateFormula' : '?/createFormula'}
				use:enhance={() => afterSubmit({ resetOnSuccess: true })}
				class="flex flex-col gap-3"
			>
				{#if editing}
					<input type="hidden" name="formulaId" value={editing.id} />
				{/if}

				<!-- "Tela" da calculadora: fórmula + resultado, monoespaçado, alinhado à direita. -->
				<div class="rounded-lg bg-muted/50 p-3 text-right">
					<input
						id="formula-expression"
						name="expression"
						bind:value={expression}
						required
						placeholder="0"
						class="w-full bg-transparent text-right font-mono text-lg outline-none placeholder:text-muted-foreground"
					/>
					<p class="mt-1 truncate font-mono text-xs text-muted-foreground">
						{#if preview}
							{#if preview.ok}
								= {displayFormat === 'currency' ? formatReais(preview.value) : preview.value}
							{:else}
								fórmula inválida
							{/if}
						{:else}
							&nbsp;
						{/if}
					</p>
				</div>

				<!-- Teclado numérico — mesma sensação de calculadora de verdade, além das variáveis. -->
				<div class="grid grid-cols-4 gap-1.5">
					{#each KEYPAD_KEYS as k (k.label)}
						<button
							type="button"
							class="flex items-center justify-center rounded-lg py-2 text-sm font-medium transition-colors {KEY_STYLES[
								k.kind
							]} {k.span === 2 ? 'col-span-2' : ''}"
							onclick={() => pressKey(k)}
							aria-label={k.action === 'backspace' ? 'Apagar último caractere' : undefined}
						>
							{#if k.action === 'backspace'}
								<BackspaceIcon size={16} />
							{:else}
								{k.label}
							{/if}
						</button>
					{/each}
				</div>

				<div class="grid gap-1.5">
					<p class="text-xs font-medium text-muted-foreground">Variáveis</p>
					<div class="flex flex-wrap gap-1.5">
						{#each variables as variable (variable.token)}
							<button
								type="button"
								class="rounded-full border border-foreground/10 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
								title={variable.description}
								onclick={() => insertVariable(variable.token)}
							>
								{variable.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid gap-2">
					<Label for="formula-name">Nome</Label>
					<Input id="formula-name" name="name" bind:value={name} required maxlength={80} />
				</div>

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

			{#if formulas.length > 0}
				<div class="flex flex-col gap-1 border-t border-foreground/10 pt-3">
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
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
