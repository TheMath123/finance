import type { NotificationType } from '@finance/shared';

import type { NotificationView } from '$lib/server/notification-api';

interface NotificationStreamEvent {
	id: string;
	type: NotificationType;
	title: string;
	body: string;
	data: Record<string, unknown> | null;
	createdAt: string;
}

/**
 * Estado client-side do sino de notificações — singleton (uma aba = uma
 * instância), populado com o load inicial do layout e mantido em tempo real
 * via SSE (`/notifications/stream`, proxy pro backend). Marcar lida/arquivar
 * atualiza aqui otimisticamente; a chamada de API real fica com o caller.
 */
class NotificationStore {
	list = $state<NotificationView[]>([]);
	#source: EventSource | null = null;

	unreadCount = $derived(this.list.filter((n) => !n.readAt && !n.archivedAt).length);

	init(initial: NotificationView[]) {
		this.list = initial;
	}

	connect() {
		if (this.#source) return;
		const source = new EventSource('/notifications/stream');
		source.onmessage = (event) => {
			const payload = JSON.parse(event.data) as NotificationStreamEvent;
			this.list = [
				{
					id: payload.id,
					workspaceId: null,
					type: payload.type,
					title: payload.title,
					body: payload.body,
					data: payload.data,
					readAt: null,
					archivedAt: null,
					createdAt: payload.createdAt
				},
				...this.list
			];
		};
		this.#source = source;
	}

	disconnect() {
		this.#source?.close();
		this.#source = null;
	}

	markReadLocal(id: string) {
		this.list = this.list.map((n) =>
			n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n
		);
	}

	archiveLocal(id: string) {
		this.list = this.list.filter((n) => n.id !== id);
	}
}

export const notifications = new NotificationStore();

/** Espelha notificationTargetRoute do mobile (push-notifications.ts), com as rotas do dashboard. */
export function notificationTargetRoute(data: Record<string, unknown> | null): string | null {
	if (!data) return null;
	if (data.inviteId) return '/workspace/my-invites';
	if (data.cardId) return `/more/cards/${data.cardId}/invoices`;
	if (data.recurringId) return '/recurring';
	return null;
}
