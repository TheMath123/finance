<script lang="ts">
	import type { NotificationType } from '@finance/shared';

	import { goto } from '$app/navigation';

	import ArchiveIcon from 'phosphor-svelte/lib/ArchiveIcon';
	import ArrowsSplitIcon from 'phosphor-svelte/lib/ArrowsSplitIcon';
	import ArrowUUpLeftIcon from 'phosphor-svelte/lib/ArrowUUpLeftIcon';
	import BellIcon from 'phosphor-svelte/lib/BellIcon';
	import CalendarCheckIcon from 'phosphor-svelte/lib/CalendarCheckIcon';
	import CreditCardIcon from 'phosphor-svelte/lib/CreditCardIcon';
	import HandCoinsIcon from 'phosphor-svelte/lib/HandCoinsIcon';
	import PaperPlaneTiltIcon from 'phosphor-svelte/lib/PaperPlaneTiltIcon';
	import UsersIcon from 'phosphor-svelte/lib/UsersIcon';
	import WhatsappLogoIcon from 'phosphor-svelte/lib/WhatsappLogoIcon';

	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch';
	import {
		notifications as notificationStore,
		notificationTargetRoute
	} from '$lib/notifications.svelte';
	import type { NotificationPreferenceView, NotificationView } from '$lib/server/notification-api';

	let { data } = $props();

	let tab = $state<'active' | 'archived'>('active');
	let active = $state<NotificationView[]>(data.active);
	let archived = $state<NotificationView[]>(data.archived);
	let preferences = $state<NotificationPreferenceView[]>(data.preferences);

	const TYPE_ICONS: Partial<Record<NotificationType, typeof BellIcon>> = {
		workspace_invite: UsersIcon,
		invoice_closed: CreditCardIcon,
		invoice_due: CreditCardIcon,
		recurring_pending: CalendarCheckIcon,
		whatsapp_linked: WhatsappLogoIcon,
		transfer_pending: HandCoinsIcon,
		transfer_accepted: PaperPlaneTiltIcon,
		split_payment_pending: ArrowsSplitIcon,
		split_payment_paid: ArrowsSplitIcon,
		split_reimbursement_confirmed: ArrowsSplitIcon
	};

	/** Mesmos textos do mobile (notification-settings.tsx), pra manter os dois clientes consistentes. */
	const TYPE_LABELS: Record<NotificationType, { title: string; description: string }> = {
		workspace_invite: {
			title: 'Convites de workspace',
			description: 'Quando alguém te convida pra um workspace compartilhado.'
		},
		invoice_closed: {
			title: 'Fatura fechou',
			description: 'Quando a fatura de um cartão fecha.'
		},
		invoice_due: {
			title: 'Fatura vence hoje',
			description: 'No dia do vencimento de uma fatura ainda não paga.'
		},
		recurring_pending: {
			title: 'Recorrência pendente',
			description: 'Quando uma recorrência prevista pro dia ainda não foi confirmada.'
		},
		whatsapp_linked: {
			title: 'WhatsApp vinculado',
			description: 'Quando um número de WhatsApp é vinculado à sua conta.'
		},
		transfer_pending: {
			title: 'Transferência recebida',
			description: 'Quando alguém te envia uma transferência pendente de aceite.'
		},
		transfer_accepted: {
			title: 'Transferência aceita',
			description: 'Quando uma transferência que você enviou é aceita.'
		},
		split_payment_pending: {
			title: 'Parte de split pendente',
			description: 'Quando alguém divide uma despesa com você.'
		},
		split_payment_paid: {
			title: 'Split marcado como pago',
			description: 'Quando um participante marca a parte dele como paga — falta você confirmar.'
		},
		split_reimbursement_confirmed: {
			title: 'Reembolso de split confirmado',
			description: 'Quando seu pagamento de uma parte é confirmado.'
		}
	};

	function timeAgo(iso: string): string {
		const diffMs = Date.now() - new Date(iso).getTime();
		const minutes = Math.floor(diffMs / 60_000);
		if (minutes < 1) return 'agora';
		if (minutes < 60) return `${minutes}min`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h`;
		const days = Math.floor(hours / 24);
		return `${days}d`;
	}

	async function openNotification(notification: NotificationView) {
		if (!notification.readAt) {
			active = active.map((n) =>
				n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n
			);
			notificationStore.markReadLocal(notification.id);
			await fetch(`/notifications/${notification.id}/read`, { method: 'POST' });
		}
		const target = notificationTargetRoute(notification.data);
		// target já é um dos caminhos internos fixos de notificationTargetRoute — resolve()
		// não aceita string genérica pra rota com params dinâmicos (ver notifications.svelte.ts).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		if (target) goto(target);
	}

	async function archiveOne(notification: NotificationView) {
		active = active.filter((n) => n.id !== notification.id);
		archived = [{ ...notification, archivedAt: new Date().toISOString() }, ...archived];
		notificationStore.archiveLocal(notification.id);
		await fetch(`/notifications/${notification.id}/archive`, { method: 'POST' });
	}

	async function unarchiveOne(notification: NotificationView) {
		archived = archived.filter((n) => n.id !== notification.id);
		active = [{ ...notification, archivedAt: null }, ...active];
		await fetch(`/notifications/${notification.id}/unarchive`, { method: 'POST' });
	}

	async function togglePreference(type: NotificationType, enabled: boolean) {
		preferences = preferences.map((p) => (p.type === type ? { ...p, enabled } : p));
		await fetch(`/notification-preferences/${type}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ enabled })
		});
	}

	const list = $derived(tab === 'active' ? active : archived);
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<h1 class="text-xl font-semibold">Notificações</h1>

	<nav class="flex flex-wrap gap-2">
		<button
			type="button"
			onclick={() => (tab = 'active')}
			class="cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors {tab === 'active'
				? 'bg-primary font-medium text-primary-foreground'
				: 'bg-primary/10 text-primary hover:bg-primary/20'}"
		>
			Ativas
		</button>
		<button
			type="button"
			onclick={() => (tab = 'archived')}
			class="cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors {tab === 'archived'
				? 'bg-primary font-medium text-primary-foreground'
				: 'bg-primary/10 text-primary hover:bg-primary/20'}"
		>
			Arquivadas
		</button>
	</nav>

	{#if list.length === 0}
		<Card class="items-center py-8 text-center">
			<p class="text-sm text-muted-foreground">
				{tab === 'active' ? 'Nenhuma notificação por aqui.' : 'Nenhuma notificação arquivada.'}
			</p>
		</Card>
	{:else}
		<div class="flex flex-col gap-2">
			{#each list as notification (notification.id)}
				{@const Icon = TYPE_ICONS[notification.type] ?? BellIcon}
				<Card class="flex-row items-start gap-3 py-3">
					<button
						type="button"
						onclick={() => openNotification(notification)}
						class="flex flex-1 cursor-pointer items-start gap-3 text-left"
					>
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10"
						>
							<Icon size={18} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								{#if !notification.readAt}
									<span class="h-2 w-2 shrink-0 rounded-full bg-primary"></span>
								{/if}
								<span class="text-sm font-medium">{notification.title}</span>
							</div>
							<p class="text-sm text-muted-foreground">{notification.body}</p>
							<p class="text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p>
						</div>
					</button>
					<Button
						variant="outline"
						size="sm"
						class="shrink-0"
						onclick={() =>
							tab === 'active' ? archiveOne(notification) : unarchiveOne(notification)}
					>
						{#if tab === 'active'}
							<ArchiveIcon size={16} />
						{:else}
							<ArrowUUpLeftIcon size={16} />
						{/if}
					</Button>
				</Card>
			{/each}
		</div>
	{/if}

	<div class="flex flex-col gap-3">
		<h2 class="text-lg font-semibold">Preferências</h2>
		{#each preferences as preference (preference.type)}
			<Card class="flex-row items-center justify-between gap-3 py-3">
				<div class="min-w-0 flex-1">
					<p class="text-sm font-medium">
						{TYPE_LABELS[preference.type]?.title ?? preference.type}
					</p>
					<p class="text-xs text-muted-foreground">
						{TYPE_LABELS[preference.type]?.description ?? ''}
					</p>
				</div>
				<Switch
					checked={preference.enabled}
					onCheckedChange={(checked) => togglePreference(preference.type, checked)}
				/>
			</Card>
		{/each}
	</div>
</div>
