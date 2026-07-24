import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { acceptInviteRoute } from './accept-invite';
import { createInviteRoute } from './create-invite';
import { createWorkspaceRoute } from './create-workspace';
import { listActivityRoute } from './list-activity';
import { listMembersRoute } from './list-members';
import { listMyInvitesRoute } from './list-my-invites';
import { listMyWorkspacesRoute } from './list-my-workspaces';
import { listWorkspaceInvitesRoute } from './list-workspace-invites';
import { removeMemberRoute } from './remove-member';
import { revokeInviteRoute } from './revoke-invite';
import { updateMemberRoleRoute } from './update-member-role';
import { updateWorkspaceRoute } from './update-workspace';

export function workspaceRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listMyWorkspacesRoute(deps))
    .use(createWorkspaceRoute(deps))
    .use(updateWorkspaceRoute(deps))
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
