export type AuthError =
  | 'email_taken'
  | 'invalid_credentials'
  | 'invalid_token'
  | 'invalid_code'
  | 'rate_limited'
  | 'email_already_in_use'
  | 'no_pending_email_change'
  | 'account_suspended'
  | 'google_token_invalid'
  | 'google_email_unverified'
  | 'google_email_registered';
