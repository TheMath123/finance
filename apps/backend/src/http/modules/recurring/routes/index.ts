import { Elysia } from "elysia";
import type { AppDeps } from "../../../deps";
import { createRecurringRoute } from "./create-recurring";
import { listRecurringRoute } from "./list-recurring";
import { updateRecurringRoute } from "./update-recurring";
import { deleteRecurringRoute } from "./delete-recurring";
import { listPendingOccurrencesRoute } from "./list-pending-occurrences";
import { confirmOccurrenceRoute } from "./confirm-occurrence";

export function recurringRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listRecurringRoute(deps))
    .use(listPendingOccurrencesRoute(deps))
    .use(createRecurringRoute(deps))
    .use(updateRecurringRoute(deps))
    .use(deleteRecurringRoute(deps))
    .use(confirmOccurrenceRoute(deps));
}
