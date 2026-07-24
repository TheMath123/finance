import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { confirmOccurrenceRoute } from './confirm-occurrence';
import { createRecurringRoute } from './create-recurring';
import { deleteRecurringRoute } from './delete-recurring';
import { listPendingOccurrencesRoute } from './list-pending-occurrences';
import { listRecurringRoute } from './list-recurring';
import { updateRecurringRoute } from './update-recurring';

export function recurringRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listRecurringRoute(deps))
    .use(listPendingOccurrencesRoute(deps))
    .use(createRecurringRoute(deps))
    .use(updateRecurringRoute(deps))
    .use(deleteRecurringRoute(deps))
    .use(confirmOccurrenceRoute(deps));
}
