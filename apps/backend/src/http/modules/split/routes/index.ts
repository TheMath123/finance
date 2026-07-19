import { Elysia } from "elysia";
import type { AppDeps } from "../../../deps";
import { createSplitRoute } from "./create-split";
import { cancelSplitRoute } from "./cancel-split";
import { markSharePaidRoute } from "./mark-share-paid";
import { confirmShareRoute } from "./confirm-share";
import { listOwedByMeRoute, listOwedToMeRoute } from "./list-owed";

export function splitRoutes(deps: AppDeps) {
  return new Elysia()
    .use(createSplitRoute(deps))
    .use(cancelSplitRoute(deps))
    .use(markSharePaidRoute(deps))
    .use(confirmShareRoute(deps))
    .use(listOwedByMeRoute(deps))
    .use(listOwedToMeRoute(deps));
}
