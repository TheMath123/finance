<script lang="ts">
	import DesktopIcon from 'phosphor-svelte/lib/DesktopIcon';
	import MoonIcon from 'phosphor-svelte/lib/MoonIcon';
	import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon';
	import SignOutIcon from 'phosphor-svelte/lib/SignOutIcon';
	import SunIcon from 'phosphor-svelte/lib/SunIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';
	import WhatsappLogoIcon from 'phosphor-svelte/lib/WhatsappLogoIcon';
	import { setMode, userPrefersMode } from 'mode-watcher';

	import { enhance } from '$app/forms';

	import AvatarField from '$lib/components/account/avatar-field.svelte';
	import GoogleLinkButton from '$lib/components/auth/google-link-button.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();

	let nameOpen = $state(false);
	let passwordOpen = $state(false);
	let emailOpen = $state(false);
	let deleteOpen = $state(false);

	// Fricção intencional antes de liberar o formulário de exclusão — mesmo
	// padrão do app mobile (nunca deixar o botão destrutivo a um clique).
	let deleteConfirmText = $state('');
	const deleteUnlocked = $derived(deleteConfirmText.trim().toUpperCase() === 'EXCLUIR');

	/** Fecha o dialog quando a action termina sem erro; o update() recarrega os dados. */
	function closeOnSuccess(close: () => void) {
		return async ({
			result,
			update
		}: {
			result: { type: string };
			update: () => Promise<void>;
		}) => {
			if (result.type === 'success') close();
			await update();
		};
	}
</script>

<svelte:head>
	<title>Conta — Marcelus</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6">
	<h1 class="text-xl font-semibold">Conta</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>Perfil</Card.Title>
			<Card.Description>
				{data.user.email}
				{#if !data.user.emailVerifiedAt}
					<span class="text-destructive">(e-mail não verificado)</span>
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<AvatarField avatarUrl={data.user.avatarUrl} />
			{#if form?.avatarMessage}
				<p class="text-sm text-destructive">{form.avatarMessage}</p>
			{/if}
			<div class="flex items-center justify-between gap-4">
				<p class="truncate text-sm font-medium">{data.user.name}</p>
				<Button variant="outline" size="sm" onclick={() => (nameOpen = true)}>
					<PencilSimpleIcon size={16} />
					Editar nome
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Segurança</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-wrap gap-2">
			<Button variant="outline" onclick={() => (passwordOpen = true)}>Trocar senha</Button>
			<Button variant="outline" onclick={() => (emailOpen = true)}>Trocar e-mail</Button>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Conta Google</Card.Title>
			<Card.Description>
				{#if data.user.googleLinked}
					Sua conta está vinculada ao Google — dá pra entrar com ele além da senha.
				{:else}
					Vincule sua conta Google (mesmo e-mail) pra também poder entrar com ele.
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-2">
			{#if data.user.googleLinked}
				<form method="POST" action="?/unlinkGoogle" use:enhance class="w-fit">
					<Button type="submit" variant="outline" size="sm">Desvincular Google</Button>
				</form>
				<p class="text-xs text-muted-foreground">
					Se desvincular, você ainda consegue entrar com sua senha, ou redefini-la a qualquer
					momento em "Esqueci minha senha".
				</p>
			{:else}
				<GoogleLinkButton />
			{/if}
			{#if form?.googleMessage}
				<p class="text-sm text-destructive">{form.googleMessage}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Tema</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-wrap gap-2">
			<Button
				variant={userPrefersMode.current === 'light' ? 'default' : 'outline'}
				size="sm"
				onclick={() => setMode('light')}
			>
				<SunIcon size={16} />
				Claro
			</Button>
			<Button
				variant={userPrefersMode.current === 'dark' ? 'default' : 'outline'}
				size="sm"
				onclick={() => setMode('dark')}
			>
				<MoonIcon size={16} />
				Escuro
			</Button>
			<Button
				variant={userPrefersMode.current === 'system' ? 'default' : 'outline'}
				size="sm"
				onclick={() => setMode('system')}
			>
				<DesktopIcon size={16} />
				Automático
			</Button>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>WhatsApp</Card.Title>
			<Card.Description>
				{#if data.user.phone}
					Vinculado ao número {data.user.phone}.
				{:else}
					Não vinculado. Vincular só é possível pelo app (depende de mandar um código a partir do
					próprio celular).
				{/if}
			</Card.Description>
		</Card.Header>
		{#if data.user.phone}
			<Card.Content>
				<form method="POST" action="?/revokeWhatsapp" use:enhance>
					<Button type="submit" variant="outline">
						<WhatsappLogoIcon size={16} />
						Revogar vínculo
					</Button>
				</form>
				{#if form?.whatsappMessage}
					<p class="mt-2 text-sm text-destructive">{form.whatsappMessage}</p>
				{/if}
			</Card.Content>
		{/if}
	</Card.Root>

	<Card.Root class="border-destructive/30">
		<Card.Header>
			<Card.Title class="text-destructive">Excluir conta</Card.Title>
			<Card.Description>
				Ação irreversível (LGPD). Workspaces em que você é o único dono são apagados por completo;
				nos compartilhados, sua participação é removida.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Button variant="destructive" onclick={() => (deleteOpen = true)}>
				<TrashIcon size={16} />
				Excluir conta
			</Button>
		</Card.Content>
	</Card.Root>

	<form method="POST" action="/logout" use:enhance>
		<Button type="submit" variant="outline" class="text-red-500">
			<SignOutIcon size={16} />
			Sair
		</Button>
	</form>
</div>

<Dialog.Root bind:open={nameOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Editar nome</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/updateName"
			class="grid gap-4"
			use:enhance={() => closeOnSuccess(() => (nameOpen = false))}
		>
			<div class="grid gap-2">
				<Label for="name">Nome</Label>
				<Input id="name" name="name" value={data.user.name} required />
			</div>
			{#if form?.nameMessage}
				<p class="text-sm text-destructive">{form.nameMessage}</p>
			{/if}
			<Dialog.Footer>
				<Button type="submit">Salvar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={passwordOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Trocar senha</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/changePassword"
			class="grid gap-4"
			use:enhance={() => closeOnSuccess(() => (passwordOpen = false))}
		>
			<div class="grid gap-2">
				<Label for="currentPassword">Senha atual</Label>
				<Input
					id="currentPassword"
					name="currentPassword"
					type="password"
					autocomplete="current-password"
					required
				/>
			</div>
			<div class="grid gap-2">
				<Label for="newPassword">Nova senha</Label>
				<Input
					id="newPassword"
					name="newPassword"
					type="password"
					autocomplete="new-password"
					required
				/>
			</div>
			{#if form?.passwordMessage}
				<p class="text-sm text-destructive">{form.passwordMessage}</p>
			{/if}
			<Dialog.Footer>
				<Button type="submit">Trocar senha</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={emailOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Trocar e-mail</Dialog.Title>
			{#if data.user.pendingEmail}
				<Dialog.Description>
					Confirmação pendente para {data.user.pendingEmail} — confira sua caixa de entrada.
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		{#if data.user.pendingEmail}
			<form
				method="POST"
				action="?/confirmEmailChange"
				class="grid gap-4"
				use:enhance={() => closeOnSuccess(() => (emailOpen = false))}
			>
				<div class="grid gap-2">
					<Label for="email-code">Código de confirmação</Label>
					<Input id="email-code" name="code" inputmode="numeric" maxlength={6} required />
				</div>
				{#if form?.emailMessage}
					<p class="text-sm text-destructive">{form.emailMessage}</p>
				{/if}
				<Dialog.Footer>
					<Button type="submit">Confirmar</Button>
				</Dialog.Footer>
			</form>
		{:else}
			<form method="POST" action="?/requestEmailChange" class="grid gap-4" use:enhance>
				<div class="grid gap-2">
					<Label for="newEmail">Novo e-mail</Label>
					<Input id="newEmail" name="newEmail" type="email" required />
				</div>
				<div class="grid gap-2">
					<Label for="email-password">Senha atual</Label>
					<Input id="email-password" name="currentPassword" type="password" required />
				</div>
				{#if form?.emailMessage}
					<p class="text-sm text-destructive">{form.emailMessage}</p>
				{/if}
				<Dialog.Footer>
					<Button type="submit">Enviar código pro novo e-mail</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root
	open={deleteOpen}
	onOpenChange={(open) => {
		deleteOpen = open;
		if (!open) deleteConfirmText = '';
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Excluir conta</Dialog.Title>
			<Dialog.Description>
				Ação irreversível (LGPD). Workspaces em que você é o único dono são apagados por completo;
				nos compartilhados, sua participação é removida.
			</Dialog.Description>
		</Dialog.Header>
		{#if form?.deletionRequested}
			<form
				method="POST"
				action="?/confirmDeletion"
				class="grid gap-4"
				use:enhance={() => closeOnSuccess(() => (deleteOpen = false))}
			>
				<div class="grid gap-2">
					<Label for="delete-code">Código enviado ao seu e-mail</Label>
					<Input id="delete-code" name="code" inputmode="numeric" maxlength={6} required />
				</div>
				<Dialog.Footer>
					<Button type="submit" variant="destructive">Excluir definitivamente</Button>
				</Dialog.Footer>
			</form>
		{:else}
			<div class="grid gap-4">
				<div class="grid gap-2">
					<Label for="delete-confirm-text">
						Digite <span class="font-mono font-semibold">EXCLUIR</span> pra habilitar
					</Label>
					<Input id="delete-confirm-text" bind:value={deleteConfirmText} autocomplete="off" />
				</div>
				<form method="POST" action="?/requestDeletion" class="grid gap-4" use:enhance>
					<div class="grid gap-2">
						<Label for="delete-password">Senha atual</Label>
						<Input
							id="delete-password"
							name="password"
							type="password"
							disabled={!deleteUnlocked}
							required
						/>
					</div>
					<Dialog.Footer>
						<Button type="submit" variant="destructive" disabled={!deleteUnlocked}>
							Solicitar exclusão
						</Button>
					</Dialog.Footer>
				</form>
			</div>
		{/if}
		{#if form?.deleteMessage}
			<p class="text-sm text-destructive">{form.deleteMessage}</p>
		{/if}
	</Dialog.Content>
</Dialog.Root>
