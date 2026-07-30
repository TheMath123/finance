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
import {
  activatePlanRoute,
  addPlanPriceRoute,
  createPlanRoute,
  deactivatePlanRoute,
  deletePlanPriceRoute,
  listPlansRoute,
  updatePlanPriceRoute,
  updatePlanRoute,
} from './plans';
import { reactivateUserRoute } from './reactivate-user';
import { suspendUserRoute } from './suspend-user';
import {
  confirmWorkspacePaymentRoute,
  listWorkspacesRoute,
  setWorkspacePlanRoute,
} from './workspaces';

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
    .use(getPlatformMetricsRoute(deps))
    .use(listPlansRoute(deps))
    .use(createPlanRoute(deps))
    .use(updatePlanRoute(deps))
    .use(deactivatePlanRoute(deps))
    .use(activatePlanRoute(deps))
    .use(addPlanPriceRoute(deps))
    .use(updatePlanPriceRoute(deps))
    .use(deletePlanPriceRoute(deps))
    .use(listWorkspacesRoute(deps))
    .use(setWorkspacePlanRoute(deps))
    .use(confirmWorkspacePaymentRoute(deps));
}
