<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import ArchiveIcon from 'phosphor-svelte/lib/ArchiveIcon';
	import ArrowsSplitIcon from 'phosphor-svelte/lib/ArrowsSplitIcon';
	import BellIcon from 'phosphor-svelte/lib/BellIcon';
	import CalendarCheckIcon from 'phosphor-svelte/lib/CalendarCheckIcon';
	import CreditCardIcon from 'phosphor-svelte/lib/CreditCardIcon';
	import HandCoinsIcon from 'phosphor-svelte/lib/HandCoinsIcon';
	import PaperPlaneTiltIcon from 'phosphor-svelte/lib/PaperPlaneTiltIcon';
	import UsersIcon from 'phosphor-svelte/lib/UsersIcon';
	import WhatsappLogoIcon from 'phosphor-svelte/lib/WhatsappLogoIcon';

	import { Badge } from '$lib/components/ui/badge';
	import * as Popover from '$lib/components/ui/popover';
	import { notifications, notificationTargetRoute } from '$lib/notifications.svelte';
	import type { NotificationView } from '$lib/server/notification-api';

	/** Mesmo mapeamento tipo→ícone do mobile (notifications.tsx), traduzido pro Phosphor Svelte. */
	const TYPE_ICONS: Partial<Record<NotificationView['type'], typeof BellIcon>> = {
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

	let { initial }: { initial: NotificationView[] } = $props();

	let open = $state(false);

	$effect(() => {
		notifications.init(initial);
		notifications.connect();
		return () => notifications.disconnect();
	});

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
		open = false;
		if (!notification.readAt) {
			notifications.markReadLocal(notification.id);
			await fetch(`/notifications/${notification.id}/read`, { method: 'POST' });
		}
		const target = notificationTargetRoute(notification.data);
		// target já é um dos caminhos internos fixos de notificationTargetRoute — resolve()
		// não aceita string genérica pra rota com params dinâmicos (ver notifications.svelte.ts).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		if (target) goto(target);
	}

	async function archive(event: MouseEvent, notification: NotificationView) {
		event.stopPropagation();
		notifications.archiveLocal(notification.id);
		await fetch(`/notifications/${notification.id}/archive`, { method: 'POST' });
	}

	const recent = $derived(notifications.list.slice(0, 8));
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class="relative flex shrink-0 items-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
		aria-label="Notificações"
	>
		<BellIcon size={18} />
		{#if notifications.unreadCount > 0}
			<Badge
				class="absolute -top-0.5 -right-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
			>
				{notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
			</Badge>
		{/if}
	</Popover.Trigger>
	<Popover.Content align="end" class="w-80 p-0">
		<div class="flex items-center justify-between border-b border-foreground/10 px-3 py-2">
			<span class="text-sm font-medium">Notificações</span>
			<a
				href={resolve('/notifications')}
				onclick={() => (open = false)}
				class="text-xs text-primary hover:underline"
			>
				Ver todas
			</a>
		</div>
		<div class="max-h-96 overflow-y-auto p-1.5">
			{#if recent.length === 0}
				<p class="px-2 py-6 text-center text-sm text-muted-foreground">
					Nenhuma notificação por aqui.
				</p>
			{:else}
				{#each recent as notification (notification.id)}
					{@const Icon = TYPE_ICONS[notification.type] ?? BellIcon}
					<button
						type="button"
						onclick={() => openNotification(notification)}
						class="flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-primary/10"
					>
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"
						>
							<Icon size={16} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-1.5">
								{#if !notification.readAt}
									<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>
								{/if}
								<span class="truncate text-sm font-medium">{notification.title}</span>
							</div>
							<p class="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
							<p class="text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p>
						</div>
						<span
							role="button"
							tabindex="0"
							onclick={(event) => archive(event, notification)}
							onkeydown={(event) => event.key === 'Enter' && archive(event as never, notification)}
							class="shrink-0 cursor-pointer rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
						>
							<ArchiveIcon size={14} />
						</span>
					</button>
				{/each}
			{/if}
		</div>
	</Popover.Content>
</Popover.Root>
