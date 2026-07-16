export type WorkspaceError =
  | "member_not_found"
  | "sole_owner_cannot_be_demoted"
  | "sole_owner_cannot_leave"
  | "owner_required_to_transfer"
  | "forbidden"
  | "already_member"
  | "invite_not_found"
  | "invite_not_pending"
  | "invite_forbidden"
  | "plan_limit_reached";
