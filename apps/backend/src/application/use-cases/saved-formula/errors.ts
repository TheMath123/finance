export type SavedFormulaError =
  | 'formula_not_found'
  | 'plan_limit_reached'
  | 'invalid_expression'
  | 'unknown_variable'
  | 'evaluation_error';
