import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { getSummaryRoute } from './get-summary';
import { getVariableExpenseEstimateRoute } from './get-variable-expense-estimate';

export function summaryRoutes(deps: AppDeps) {
  return new Elysia()
    .use(getSummaryRoute(deps))
    .use(getVariableExpenseEstimateRoute(deps));
}
