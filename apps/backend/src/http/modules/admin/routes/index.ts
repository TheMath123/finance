import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import {
  createDefaultCategoryRoute,
  deleteDefaultCategoryRoute,
  listDefaultCategoriesRoute,
  updateDefaultCategoryRoute,
} from './default-categories';
import { listUsersRoute } from './list-users';
import { reactivateUserRoute } from './reactivate-user';
import { suspendUserRoute } from './suspend-user';

export function adminRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listUsersRoute(deps))
    .use(suspendUserRoute(deps))
    .use(reactivateUserRoute(deps))
    .use(listDefaultCategoriesRoute(deps))
    .use(createDefaultCategoryRoute(deps))
    .use(updateDefaultCategoryRoute(deps))
    .use(deleteDefaultCategoryRoute(deps));
}
