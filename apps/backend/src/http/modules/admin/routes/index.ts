import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { getAiSettingsRoute, updateAiSettingsRoute } from './ai-settings';
import {
  createDefaultCategoryRoute,
  deleteDefaultCategoryRoute,
  listDefaultCategoriesRoute,
  updateDefaultCategoryRoute,
} from './default-categories';
import {
  deleteFeatureFlagRoute,
  listFeatureFlagsRoute,
  upsertFeatureFlagRoute,
} from './feature-flags';
import { listUsersRoute } from './list-users';
import { getPlatformMetricsRoute } from './metrics';
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
    .use(deleteDefaultCategoryRoute(deps))
    .use(getAiSettingsRoute(deps))
    .use(updateAiSettingsRoute(deps))
    .use(listFeatureFlagsRoute(deps))
    .use(upsertFeatureFlagRoute(deps))
    .use(deleteFeatureFlagRoute(deps))
    .use(getPlatformMetricsRoute(deps));
}
