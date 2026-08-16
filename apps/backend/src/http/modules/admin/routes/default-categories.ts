import { Elysia } from 'elysia';
import {
  createDefaultCategory,
  deleteDefaultCategory,
  listDefaultCategories,
  updateDefaultCategory,
} from '../../../../application/use-cases/admin';
import type { AppDeps } from '../../../deps';
import { requireSuperadmin } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams, validateQuery } from '../../../validate';
import { ADMIN_ERRORS } from '../errors';
import {
  createDefaultCategorySchema,
  defaultCategoryParamsSchema,
  listDefaultCategoriesQuerySchema,
  updateDefaultCategorySchema,
} from '../schemas';

export const listDefaultCategoriesRoute = (deps: AppDeps) =>
  new Elysia().get(
    '/admin/default-categories',
    async ({ request, query, set }) => {
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const q = validateQuery(listDefaultCategoriesQuerySchema, query);
      if (!q.ok) return fail(set, q.error);
      return listDefaultCategories(deps, q.value.search);
    }
  );

export const createDefaultCategoryRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/admin/default-categories',
    async ({ request, body, set }) => {
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(createDefaultCategorySchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createDefaultCategory(
        deps,
        auth.value.userId,
        input.value
      );
      return respond(set, result, ADMIN_ERRORS, 201);
    }
  );

export const updateDefaultCategoryRoute = (deps: AppDeps) =>
  new Elysia().patch(
    '/admin/default-categories/:categoryId',
    async ({ request, params, body, set }) => {
      const p = validateParams(defaultCategoryParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updateDefaultCategorySchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateDefaultCategory(
        deps,
        auth.value.userId,
        p.value.categoryId,
        input.value
      );
      return respond(set, result, ADMIN_ERRORS, 200);
    }
  );

export const deleteDefaultCategoryRoute = (deps: AppDeps) =>
  new Elysia().delete(
    '/admin/default-categories/:categoryId',
    async ({ request, params, set }) => {
      const p = validateParams(defaultCategoryParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteDefaultCategory(
        deps,
        auth.value.userId,
        p.value.categoryId
      );
      return respond(set, result, ADMIN_ERRORS, 204);
    }
  );
