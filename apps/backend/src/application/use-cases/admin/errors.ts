export type AdminError =
  | 'user_not_found'
  | 'default_category_not_found'
  | 'cannot_suspend_self'
  | 'cannot_delete_fallback_category'
  | 'plan_key_taken'
  | 'plan_not_found'
  | 'workspace_not_found';
