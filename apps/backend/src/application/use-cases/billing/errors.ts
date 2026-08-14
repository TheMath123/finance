export type BillingError =
  | 'plan_not_found'
  | 'plan_price_not_found'
  | 'no_active_subscription'
  | 'already_subscribed'
  | 'plan_not_purchasable';
