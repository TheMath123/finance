import { Elysia } from 'elysia';
import { isFeatureEnabled } from '../../../../application/services/feature-flags';
import { deleteCategory } from '../../../../application/use-cases/category';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { CATEGORY_ERRORS } from '../errors';
import { categoryParamsSchema } from '../schemas';

export const deleteCategoryRoute = (deps: AppDeps) =>
  new Elysia().delete(
    '/workspaces/:workspaceId/categories/:categoryId',
    async ({ request, params, set }) => {
      const p = validateParams(categoryParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'admin'
      );
      if (!auth.ok) return fail(set, auth.error);

      if (!(await isFeatureEnabled(deps, 'custom_category_creation'))) {
        return fail(set, {
          status: 403,
          code: 'feature_disabled',
          message: 'Excluir categoria própria ainda não está disponível.',
        });
      }

      const result = await deleteCategory(deps, auth.value, p.value.categoryId);
      return respond(set, result, CATEGORY_ERRORS);
    }
  );
