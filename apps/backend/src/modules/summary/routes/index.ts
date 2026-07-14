import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { getSummaryRoute } from "./get-summary";

export function summaryRoutes(deps: AppDeps) {
  return new Elysia().use(getSummaryRoute(deps));
}
