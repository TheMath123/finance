<script lang="ts">
	import FileCsvIcon from 'phosphor-svelte/lib/FileCsv';
	import UploadSimpleIcon from 'phosphor-svelte/lib/UploadSimple';
	import XIcon from 'phosphor-svelte/lib/X';
	import { cn } from '$lib/utils.js';

	/**
	 * Dropzone de arquivo (clique ou arraste) — substitui o `<input type="file">`
	 * nu, que vem com rótulo de botão do navegador ("Escolher ficheiro"/
	 * "Nenhum ficheiro selecionado", em pt-PT no Chrome com idioma do SO em
	 * português) e nenhum feedback visual de arquivo selecionado além de texto
	 * pequeno ao lado. Aqui a área inteira reage a clique/arraste, e o arquivo
	 * escolhido vira um cartão com nome, tamanho e botão de trocar.
	 */
	let {
		id,
		accept,
		file = $bindable(null),
		disabled = false,
		placeholder = 'Arraste o arquivo aqui ou clique para selecionar'
	}: {
		id?: string;
		accept?: string;
		file?: File | null;
		disabled?: boolean;
		placeholder?: string;
	} = $props();

	let inputEl = $state<HTMLInputElement>();
	let dragging = $state(false);

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function openPicker() {
		if (!disabled) inputEl?.click();
	}

	function onDragOver(e: DragEvent) {
		if (disabled) return;
		e.preventDefault();
		dragging = true;
	}
	function onDragLeave() {
		dragging = false;
	}
	function onDrop(e: DragEvent) {
		if (disabled) return;
		e.preventDefault();
		dragging = false;
		const dropped = e.dataTransfer?.files?.[0];
		if (dropped) file = dropped;
	}

	function clearFile(e: Event) {
		e.stopPropagation();
		file = null;
		if (inputEl) inputEl.value = '';
	}
</script>

<input
	{id}
	bind:this={inputEl}
	type="file"
	{accept}
	{disabled}
	class="sr-only"
	onchange={(e) => (file = e.currentTarget.files?.[0] ?? null)}
/>

<div
	role="button"
	tabindex={disabled ? -1 : 0}
	aria-disabled={disabled}
	onclick={openPicker}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			openPicker();
		}
	}}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
	class={cn(
		'flex min-h-24 w-full items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
		disabled
			? 'cursor-not-allowed border-foreground/10 bg-foreground/[0.02] opacity-50'
			: 'cursor-pointer border-foreground/15 bg-foreground/[0.02] hover:border-primary/40 hover:bg-primary/5',
		dragging && 'border-primary bg-primary/10'
	)}
>
	{#if file}
		<span
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
		>
			<FileCsvIcon size={20} weight="fill" />
		</span>
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-medium">{file.name}</p>
			<p class="text-xs text-muted-foreground">{formatSize(file.size)}</p>
		</div>
		<button
			type="button"
			onclick={clearFile}
			{disabled}
			aria-label="Remover arquivo"
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none"
		>
			<XIcon size={16} />
		</button>
	{:else}
		<span
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground"
		>
			<UploadSimpleIcon size={18} />
		</span>
		<p class="text-sm text-muted-foreground">{placeholder}</p>
	{/if}
</div>
