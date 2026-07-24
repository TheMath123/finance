import { apiRequest } from '@/lib/api-client';

export interface WhatsAppLinkStarted {
  code: string;
  expiresAt: string;
}

export const whatsappApi = {
  startLink: () =>
    apiRequest<WhatsAppLinkStarted>('/whatsapp/link/start', { method: 'POST' }),

  revokeLink: () => apiRequest<void>('/whatsapp/link', { method: 'DELETE' }),
};
