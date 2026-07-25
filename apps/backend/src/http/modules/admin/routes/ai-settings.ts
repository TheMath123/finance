import { Elysia } from 'elysia';
import {
  getAiSettings,
  updateAiSettings,
} from '../../../../application/use-cases/admin';
import type { AppDeps } from '../../../deps';
import { requireSuperadmin } from '../../../guards';
import { fail } from '../../../http-error';
import { validateBody } from '../../../validate';
import { updateAiSettingsSchema } from '../schemas';

export const getAiSettingsRoute = (deps: AppDeps) =>
  new Elysia().get('/admin/ai-settings', async ({ request, set }) => {
    const auth = await requireSuperadmin(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return getAiSettings(deps);
  });

export const updateAiSettingsRoute = (deps: AppDeps) =>
  new Elysia().patch('/admin/ai-settings', async ({ request, body, set }) => {
    const auth = await requireSuperadmin(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const input = validateBody(updateAiSettingsSchema, body);
    if (!input.ok) return fail(set, input.error);
    return updateAiSettings(deps, auth.value.userId, input.value);
  });
