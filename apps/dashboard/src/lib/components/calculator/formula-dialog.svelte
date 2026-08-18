<script lang="ts">
	import { evaluateFormula, formatFormulaDisplay } from '@finance/formula';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import BackspaceIcon from 'phosphor-svelte/lib/BackspaceIcon';
	import XIcon from 'phosphor-svelte/lib/X';

	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	import SelectField from '$lib/components/calculator/select-field.svelte';
	import SavedFormulaRow from '$lib/components/calculator/saved-formula-row.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import type { FormulaVariableGroup, FormulaVariableValue } from '$lib/formula-catalog';
	import { formatReais } from '$lib/money';
	import type { SavedFormulaView } from '$lib/server/formula-api';

	let {
		open = $bindable(false),
		variables,
		values,
		formulas,
		form
	}: {
		open: boolean;
		variables: FormulaVariableValue[];
		values: Record<string, number>;
		formulas: SavedFormulaView[];
		form?: { message?: string; code?: string } | null;
	} = $props();

	const limitReached = $derived(form?.code === 'plan_limit_reached');

	let editing = $state<SavedFormulaView | null>(null);
	let name = $state('');
	let expression = $state('');
	let displayFormat = $state<'currency' | 'number'>('currency');
	/** Não é exclusivo — a mesma fórmula pode virar widget nas duas telas ao mesmo tempo. */
	let pinnedHome = $state(false);
	let pinnedTransactions = $state(false);

	/** Primeiro elemento arrastável do codebase — pointer events manuais, sem lib nova. */
	let dragOffset = $state({ x: 0, y: 0 });
	let dragging = false;
	let dragStart = { x: 0, y: 0, offsetX: 0, offsetY: 0 };
	/** Referência ao card pra limitar o arraste (evita jogar o cabeçalho pra fora da tela e ficar sem como pegar de volta). */
	let contentEl = $state<HTMLElement | null>(null);

	function startDrag(event: PointerEvent) {
		// O botão de fechar (X) mora dentro do cabeçalho arrastável — sem este
		// guard, o setPointerCapture abaixo captura o ponteiro pro <div> assim
		// que o botão é pressionado, e o pointerup/click do X nunca chega a
		// disparar de verdade (bug real em produção: "X" da calculadora parava
		// de fechar o dialog).
		if ((event.target as HTMLElement).closest('button')) return;
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
			// Posição "natural" (sem nenhum deslocamento de arraste aplicado) — a
			// posição atual já inclui o `dragOffset` corrente, então subtraímos.
			const rect = contentEl.getBoundingClientRect();
			const naturalLeft = rect.left - dragOffset.x;
			const naturalTop = rect.top - dragOffset.y;
			/** Cantos do card sempre dentro dessa margem da tela — o cabeçalho (topo) nunca fica inalcançável. */
			const margin = 64;
			const minX = 0 - naturalLeft;
			const maxX = window.innerWidth - margin - naturalLeft;
			const minY = 0 - naturalTop;
			const maxY = window.innerHeight - margin - naturalTop;
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
		pinnedHome = false;
		pinnedTransactions = false;
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
		pinnedHome = formula.pinnedHome;
		pinnedTransactions = formula.pinnedTransactions;
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

	/** token → label, pra mostrar a expressão de forma legível acima do campo cru (ver formatFormulaDisplay abaixo) em vez de só o identificador (ex.: fatura_cartao_01a00c4f7b...). */
	const tokenLabels = $derived(Object.fromEntries(variables.map((v) => [v.token, v.label])));
	const readableExpression = $derived(formatFormulaDisplay(expression, tokenLabels));

	/**
	 * Chips agrupados (em vez de uma lista plana) — com o catálogo estendido
	 * (conta/cartão/método, M5-01c) a lista cresce bastante e ficava difícil
	 * de escanear; cada chip também trunca o rótulo (nome de categoria/conta/
	 * cartão pode ser longo) mantendo o nome completo no `title`.
	 */
	const GROUP_LABELS: Record<FormulaVariableGroup, string> = {
		summary: 'Resumo do mês',
		category: 'Por categoria',
		account: 'Por conta',
		card: 'Por cartão',
		method: 'Por método de pagamento'
	};
	const GROUP_ORDER: FormulaVariableGroup[] = ['summary', 'category', 'account', 'card', 'method'];
	const groupedVariables = $derived(
		GROUP_ORDER.map((group) => ({
			group,
			items: variables.filter((variable) => variable.group === group)
		})).filter(({ items }) => items.length > 0)
	);

	type KeypadKey = {
		label: string;
		action: 'clear' | 'backspace' | 'insert';
		key?: string;
		kind: 'action' | 'operator' | 'digit';
		span?: number;
	};

	/** Grid de 4 colunas — "0" ocupa 2 células, fechando 5 linhas certinhas. */
	const KEYPAD_KEYS: KeypadKey[] = [
		{ label: '(', action: 'insert', key: '(', kind: 'operator' },
		{ label: ')', action: 'insert', key: ')', kind: 'operator' },
		{ label: 'C', action: 'clear', kind: 'action' },
		{ label: '⌫', action: 'backspace', kind: 'action' },
		{ label: '7', action: 'insert', key: '7', kind: 'digit' },
		{ label: '8', action: 'insert', key: '8', kind: 'digit' },
		{ label: '9', action: 'insert', key: '9', kind: 'digit' },
		{ label: '÷', action: 'insert', key: '/', kind: 'operator' },
		{ label: '4', action: 'insert', key: '4', kind: 'digit' },
		{ label: '5', action: 'insert', key: '5', kind: 'digit' },
		{ label: '6', action: 'insert', key: '6', kind: 'digit' },
		{ label: '×', action: 'insert', key: '*', kind: 'operator' },
		{ label: '1', action: 'insert', key: '1', kind: 'digit' },
		{ label: '2', action: 'insert', key: '2', kind: 'digit' },
		{ label: '3', action: 'insert', key: '3', kind: 'digit' },
		{ label: '−', action: 'insert', key: '-', kind: 'operator' },
		{ label: '0', action: 'insert', key: '0', kind: 'digit', span: 2 },
		{ label: ',', action: 'insert', key: '.', kind: 'digit' },
		{ label: '+', action: 'insert', key: '+', kind: 'operator' }
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

	/**
	 * Reseta o formulário só quando a action salva/edita com sucesso; excluir só
	 * recarrega a lista. `invalidateAll()` explícito além do `update()` — o valor
	 * salvo (ex.: pinnedHome=true) já chega certo no backend, mas sem isso o widget
	 * fixado só aparecia depois de um F5 manual na página.
	 */
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
			await invalidateAll();
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
			style="transform: translate({dragOffset.x}px, {dragOffset.y}px)"
			class="fixed inset-4 z-50 m-auto flex h-fit max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] flex-col overflow-y-auto rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-sm md:max-w-3xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
		>
			<!-- Cabeçalho fica `sticky` — mesmo se o conteúdo for mais alto que a tela e
			     precisar rolar, o cabeçalho (única alça de arraste) nunca some de vista. -->
			<div
				class="sticky top-0 z-10 flex shrink-0 cursor-grab items-center justify-between rounded-t-xl border-b border-foreground/10 bg-popover p-4 active:cursor-grabbing"
				role="button"
				tabindex="0"
				aria-label="Arraste para mover a calculadora"
				onpointerdown={startDrag}
				onpointermove={onDrag}
				onpointerup={stopDrag}
				onpointercancel={stopDrag}
			>
				<Dialog.Title>Calculadora de fórmulas</Dialog.Title>
				<DialogPrimitive.Close>
					{#snippet child({ props })}
						<Button variant="ghost" size="icon-sm" {...props}>
							<XIcon />
							<span class="sr-only">Fechar</span>
						</Button>
					{/snippet}
				</DialogPrimitive.Close>
			</div>

			<form
				method="POST"
				action={editing ? '?/updateFormula' : '?/createFormula'}
				use:enhance={() => afterSubmit({ resetOnSuccess: true })}
				class="flex flex-col gap-4 p-4"
			>
				{#if editing}
					<input type="hidden" name="formulaId" value={editing.id} />
				{/if}

				<!-- Calculadora (tela+teclado, coluna fixa) e variáveis (painel largo e rolável) lado a
				     lado a partir de md — evita que o catálogo estendido (conta/cartão/método) deixe o
				     dialog gigante na vertical; em telas estreitas cai pra empilhado normal. -->
				<div class="flex flex-col gap-4 md:flex-row md:items-start">
					<div class="flex flex-col gap-3 md:w-64 md:shrink-0">
						<!-- "Tela" da calculadora: fórmula + resultado, alinhado à direita. Linha
						     legível (nomes em vez de identificador cru) fica ACIMA do campo de
						     digitação de verdade — trocar o próprio input pelo texto formatado
						     quebraria digitação livre por teclado (só o dashboard permite isso,
						     diferente do mobile, que só edita via teclado numérico on-screen). -->
						<div class="rounded-lg bg-muted/50 p-3 text-right">
							{#if readableExpression.trim()}
								<p class="mb-1 text-xs break-words text-muted-foreground">
									{readableExpression}
								</p>
							{/if}
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
					</div>

					<div
						class="grid gap-2 border-t border-foreground/10 pt-3 md:max-h-[24rem] md:flex-1 md:overflow-y-auto md:border-t-0 md:border-l md:pt-0 md:pl-4"
					>
						<p class="text-xs font-medium text-muted-foreground">Variáveis</p>
						{#each groupedVariables as { group, items } (group)}
							<div class="grid gap-1">
								<p class="text-[11px] font-medium text-muted-foreground/70">
									{GROUP_LABELS[group]}
								</p>
								<div class="flex flex-wrap gap-1.5">
									{#each items as variable (variable.token)}
										<button
											type="button"
											class="max-w-[14rem] rounded-lg border border-foreground/10 px-2.5 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
											title={variable.description}
											onclick={() => insertVariable(variable.token)}
										>
											{variable.label}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="grid gap-2">
						<Label for="formula-name">Nome</Label>
						<Input id="formula-name" name="name" bind:value={name} required maxlength={80} />
					</div>

					<div class="grid gap-2">
						<Label id="formula-display-format-label">Formato</Label>
						<input type="hidden" name="displayFormat" value={displayFormat} />
						<SelectField
							value={displayFormat}
							onValueChange={(v) => (displayFormat = v as 'currency' | 'number')}
							ariaLabelledby="formula-display-format-label"
							options={[
								{ value: 'currency', label: 'Moeda' },
								{ value: 'number', label: 'Número' }
							]}
						/>
					</div>
				</div>

				<!-- Fixar não é uma escolha única — a mesma fórmula pode virar widget nas duas telas. -->
				<div class="grid gap-2">
					<Label>Fixar como widget em</Label>
					<input type="hidden" name="pinnedHome" value={pinnedHome} />
					<input type="hidden" name="pinnedTransactions" value={pinnedTransactions} />
					<div
						class="grid grid-cols-1 gap-1 rounded-lg border border-foreground/10 p-1 sm:grid-cols-2"
					>
						<label
							for="formula-pin-home"
							class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
						>
							Início
							<Switch id="formula-pin-home" bind:checked={pinnedHome} />
						</label>
						<label
							for="formula-pin-transactions"
							class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
						>
							Transações
							<Switch id="formula-pin-transactions" bind:checked={pinnedTransactions} />
						</label>
					</div>
				</div>

				{#if limitReached}
					<div
						class="flex flex-col items-start justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive sm:flex-row sm:items-center"
					>
						<span>Limite de fórmulas salvas do seu plano atingido.</span>
						<Button href={resolve('/workspace/plan')} size="sm" variant="destructive">
							Fazer upgrade do plano
						</Button>
					</div>
				{:else if form?.message}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}

				<Dialog.Footer>
					{#if editing}
						<Button type="button" variant="outline" onclick={startCreate}>Cancelar edição</Button>
					{/if}
					<Button type="submit">{editing ? 'Salvar alterações' : 'Salvar fórmula'}</Button>
				</Dialog.Footer>
			</form>

			{#if formulas.length > 0}
				<div class="flex flex-col gap-1 border-t border-foreground/10 p-4 pt-3">
					<p class="text-xs font-medium text-muted-foreground">Fórmulas salvas</p>
					<div class="grid gap-1 md:grid-cols-2">
						{#each formulas as formula (formula.id)}
							<SavedFormulaRow {formula} onEdit={startEdit} />
						{/each}
					</div>
				</div>
			{/if}
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
