import { NOTIFICATION_TYPES } from '@finance/shared';
import { z } from 'zod';

export const notificationParamsSchema = z.object({
  notificationId: z.string().uuid(),
});
export const preferenceParamsSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
});

export const listNotificationsQuerySchema = z.object({
  archived: z.coerce.boolean().optional(),
});

export const updatePreferenceSchema = z.object({
  enabled: z.boolean(),
});

export const registerPushTokenSchema = z.object({
  token: z.string().min(1, 'Informe o token').max(300),
});

export const unregisterPushTokenSchema = z.object({
  token: z.string().min(1, 'Informe o token').max(300),
});
