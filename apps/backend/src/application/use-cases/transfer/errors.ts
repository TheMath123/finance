export type TransferError =
  | "rate_limited"
  | "invalid_amount"
  | "recipient_not_found"
  | "self_transfer"
  | "account_not_found"
  | "transfer_not_found"
  | "not_recipient"
  | "already_finalized"
  | "trusted_contact_not_found";
