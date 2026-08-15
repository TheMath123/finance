<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon';

	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';

	let { avatarUrl }: { avatarUrl: string | null } = $props();

	// Override local — a foto do usuário vem do layout pai, que não recarrega
	// sozinho num `update()` de action (mesmo motivo documentado em
	// attachment-field.svelte). Upload usa preview otimista via
	// `URL.createObjectURL` (aparece na hora, sem depender da resposta do
	// servidor); remover só zera. Reverte pro valor real em erro — a
	// mensagem em si (`form?.avatarMessage`) é exibida pela página, não aqui.
	let override = $state<string | null | undefined>(undefined);
	const currentUrl = $derived(override !== undefined ? override : avatarUrl);

	let fileInput = $state<HTMLInputElement>();

	function handleFileChange(e: Event & { currentTarget: HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		if (file) override = URL.createObjectURL(file);
		e.currentTarget.form?.requestSubmit();
	}

	const handleResult: Awaited<ReturnType<SubmitFunction>> = async ({ result, update }) => {
		if (result.type === 'failure') override = avatarUrl;
		await update();
	};

	const submitUpload: SubmitFunction = () => handleResult;
</script>

<div class="flex items-center gap-4">
	{#if currentUrl}
		<img
			src={currentUrl}
			alt="Avatar"
			class="h-16 w-16 rounded-full border border-foreground/10 object-cover"
		/>
	{:else}
		<UserCircleIcon size={64} class="text-muted-foreground" weight="light" />
	{/if}

	<div class="flex flex-wrap gap-2">
		<form
			method="POST"
			action="?/uploadAvatar"
			enctype="multipart/form-data"
			use:enhance={submitUpload}
		>
			<input
				type="file"
				name="file"
				accept="image/jpeg,image/png,image/webp"
				class="hidden"
				bind:this={fileInput}
				onchange={handleFileChange}
			/>
			<Button type="button" variant="outline" size="sm" onclick={() => fileInput?.click()}>
				Alterar foto
			</Button>
		</form>
		{#if currentUrl}
			<form
				method="POST"
				action="?/removeAvatar"
				use:enhance={() => {
					override = null;
					return handleResult;
				}}
			>
				<Button type="submit" variant="outline" size="sm">Remover foto</Button>
			</form>
		{/if}
	</div>
</div>
