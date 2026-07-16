import { Elysia } from "elysia";
import type { AppDeps } from "../../../deps";
import { listMyWorkspacesRoute } from "./list-my-workspaces";
import { createWorkspaceRoute } from "./create-workspace";
import { listMembersRoute } from "./list-members";
import { updateMemberRoleRoute } from "./update-member-role";
import { removeMemberRoute } from "./remove-member";
import { createInviteRoute } from "./create-invite";
import { listWorkspaceInvitesRoute } from "./list-workspace-invites";
import { listMyInvitesRoute } from "./list-my-invites";
import { acceptInviteRoute } from "./accept-invite";
import { revokeInviteRoute } from "./revoke-invite";
import { listActivityRoute } from "./list-activity";

export function workspaceRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listMyWorkspacesRoute(deps))
    .use(createWorkspaceRoute(deps))
    .use(listMembersRoute(deps))
    .use(updateMemberRoleRoute(deps))
    .use(removeMemberRoute(deps))
    .use(createInviteRoute(deps))
    .use(listWorkspaceInvitesRoute(deps))
    .use(listMyInvitesRoute(deps))
    .use(acceptInviteRoute(deps))
    .use(revokeInviteRoute(deps))
    .use(listActivityRoute(deps));
}
