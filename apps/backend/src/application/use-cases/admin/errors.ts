export type AdminError =
  | 'user_not_found'
  | 'default_category_not_found'
  | 'cannot_suspend_self'
  | 'cannot_delete_fallback_category'
  | 'plan_key_taken'
  | 'plan_not_found'
  | 'workspace_not_found'
  | 'unknown_feature_key'
  | 'plan_price_interval_taken'
  | 'plan_price_not_found'
  | 'plan_price_required'
  | 'feature_flag_not_found'
  | 'cannot_delete_system_feature_flag';
