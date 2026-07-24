import { Elysia } from 'elysia';
import {
  archiveNotification,
  unarchiveNotification,
} from '../../../../application/use-cases/notification';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { NOTIFICATION_ERRORS } from '../errors';
import { notificationParamsSchema } from '../schemas';

export const archiveNotificationRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/notifications/:notificationId/archive',
    async ({ request, params, set }) => {
      const p = validateParams(notificationParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireAuthenticated(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await archiveNotification(
        deps,
        auth.value.userId,
        p.value.notificationId
      );
      return respond(set, result, NOTIFICATION_ERRORS, 204);
    }
  );

export const unarchiveNotificationRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/notifications/:notificationId/unarchive',
    async ({ request, params, set }) => {
      const p = validateParams(notificationParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireAuthenticated(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await unarchiveNotification(
        deps,
        auth.value.userId,
        p.value.notificationId
      );
      return respond(set, result, NOTIFICATION_ERRORS, 204);
    }
  );
