import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { cancelSplitRoute } from './cancel-split';
import { confirmShareRoute } from './confirm-share';
import { createSplitRoute } from './create-split';
import { listOwedByMeRoute, listOwedToMeRoute } from './list-owed';
import { markSharePaidRoute } from './mark-share-paid';

export function splitRoutes(deps: AppDeps) {
  return new Elysia()
    .use(createSplitRoute(deps))
    .use(cancelSplitRoute(deps))
    .use(markSharePaidRoute(deps))
    .use(confirmShareRoute(deps))
    .use(listOwedByMeRoute(deps))
    .use(listOwedToMeRoute(deps));
}
