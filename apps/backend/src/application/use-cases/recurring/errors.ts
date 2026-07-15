import type { TransactionError } from "../transaction/errors";

export type RecurringError =
  | "recurring_not_found"
  | "invalid_rule"
  | "occurrence_already_confirmed"
  | "not_an_occurrence"
  | TransactionError;
