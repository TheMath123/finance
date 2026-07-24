<script lang="ts">
	import SignOut from 'phosphor-svelte/lib/SignOut';
	import WhatsappLogo from 'phosphor-svelte/lib/WhatsappLogo';

	import { enhance } from '$app/forms';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();

	// Fricção intencional antes de liberar o formulário de exclusão — mesmo
	// padrão do app mobile (nunca deixar o botão destrutivo a um clique).
	let deleteConfirmText = $state('');
	const deleteUnlocked = $derived(deleteConfirmText.trim().toUpperCase() === 'EXCLUIR');
</script>

<svelte:head>
	<title>Conta — Finance</title>
</svelte:head>

<div class="flex flex-col gap-6">
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
		<Card.Content>
			<form method="POST" action="?/updateName" class="flex items-end gap-3" use:enhance>
				<div class="grid flex-1 gap-2">
					<Label for="name">Nome</Label>
					<Input id="name" name="name" value={data.user.name} required />
				</div>
				<Button type="submit">Salvar</Button>
			</form>
			{#if form?.nameMessage}
				<p class="mt-2 text-sm text-destructive">{form.nameMessage}</p>
			{/if}
			{#if form?.nameUpdated}
				<p class="mt-2 text-sm text-success">Nome atualizado.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Trocar senha</Card.Title>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/changePassword" class="grid gap-4" use:enhance>
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
				<Button type="submit" class="w-fit">Trocar senha</Button>
			</form>
			{#if form?.passwordMessage}
				<p class="mt-2 text-sm text-destructive">{form.passwordMessage}</p>
			{/if}
			{#if form?.passwordChanged}
				<p class="mt-2 text-sm text-success">Senha atualizada.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Trocar e-mail</Card.Title>
			{#if data.user.pendingEmail}
				<Card.Description>
					Confirmação pendente para {data.user.pendingEmail} — confira sua caixa de entrada.
				</Card.Description>
			{/if}
		</Card.Header>
		<Card.Content class="grid gap-4">
			{#if data.user.pendingEmail}
				<form method="POST" action="?/confirmEmailChange" class="flex items-end gap-3" use:enhance>
					<div class="grid gap-2">
						<Label for="email-code">Código de confirmação</Label>
						<Input id="email-code" name="code" inputmode="numeric" maxlength={6} required />
					</div>
					<Button type="submit">Confirmar</Button>
				</form>
			{:else}
				<form
					method="POST"
					action="?/requestEmailChange"
					class="grid gap-4 sm:grid-cols-2"
					use:enhance
				>
					<div class="grid gap-2">
						<Label for="newEmail">Novo e-mail</Label>
						<Input id="newEmail" name="newEmail" type="email" required />
					</div>
					<div class="grid gap-2">
						<Label for="email-password">Senha atual</Label>
						<Input id="email-password" name="currentPassword" type="password" required />
					</div>
					<Button type="submit" class="w-fit sm:col-span-2">Enviar código pro novo e-mail</Button>
				</form>
			{/if}
			{#if form?.emailMessage}
				<p class="text-sm text-destructive">{form.emailMessage}</p>
			{/if}
			{#if form?.emailChangeRequested}
				<p class="text-sm text-success">Código enviado — confira o novo e-mail.</p>
			{/if}
			{#if form?.emailChanged}
				<p class="text-sm text-success">E-mail atualizado.</p>
			{/if}
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
						<WhatsappLogo size={16} />
						Revogar vínculo
					</Button>
				</form>
				{#if form?.whatsappMessage}
					<p class="mt-2 text-sm text-destructive">{form.whatsappMessage}</p>
				{/if}
			</Card.Content>
		{/if}
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Sessão</Card.Title>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="/logout" use:enhance>
				<Button type="submit" variant="outline">
					<SignOut size={16} />
					Sair
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root class="border-destructive/30">
		<Card.Header>
			<Card.Title class="text-destructive">Excluir conta</Card.Title>
			<Card.Description>
				Ação irreversível (LGPD). Workspaces em que você é o único dono são apagados por completo;
				nos compartilhados, sua participação é removida.
			</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-4">
			{#if form?.deletionRequested}
				<form method="POST" action="?/confirmDeletion" class="flex items-end gap-3" use:enhance>
					<div class="grid gap-2">
						<Label for="delete-code">Código enviado ao seu e-mail</Label>
						<Input id="delete-code" name="code" inputmode="numeric" maxlength={6} required />
					</div>
					<Button type="submit" variant="destructive">Excluir definitivamente</Button>
				</form>
			{:else}
				<div class="grid gap-2">
					<Label for="delete-confirm-text">
						Digite <span class="font-mono font-semibold">EXCLUIR</span> pra habilitar
					</Label>
					<Input id="delete-confirm-text" bind:value={deleteConfirmText} autocomplete="off" />
				</div>
				<form method="POST" action="?/requestDeletion" class="flex items-end gap-3" use:enhance>
					<div class="grid flex-1 gap-2">
						<Label for="delete-password">Senha atual</Label>
						<Input
							id="delete-password"
							name="password"
							type="password"
							disabled={!deleteUnlocked}
							required
						/>
					</div>
					<Button type="submit" variant="destructive" disabled={!deleteUnlocked}>
						Solicitar exclusão
					</Button>
				</form>
			{/if}
			{#if form?.deleteMessage}
				<p class="text-sm text-destructive">{form.deleteMessage}</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
