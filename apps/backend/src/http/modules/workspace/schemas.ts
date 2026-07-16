import { z } from "zod";
import { INVITE_ROLES, WORKSPACE_ROLES } from "@finance/shared";

export const workspaceParamsSchema = z.object({ workspaceId: z.string().uuid() });
export const memberParamsSchema = workspaceParamsSchema.extend({ userId: z.string().uuid() });
export const inviteParamsSchema = z.object({ inviteId: z.string().uuid() });

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Informe um nome").max(120),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "Informe um nome").max(120),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(WORKSPACE_ROLES),
});

export const createInviteSchema = z.object({
  emailOrPhone: z.string().min(3).max(120),
  role: z.enum(INVITE_ROLES),
});

export const listActivitySchema = z.object({
  entity: z.string().max(60).optional(),
  userId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data no formato YYYY-MM-DD").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data no formato YYYY-MM-DD").optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
