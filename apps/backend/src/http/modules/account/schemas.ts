import { z } from "zod";
import { ACCOUNT_TYPES } from "@finance/shared";

export const workspaceParamsSchema = z.object({ workspaceId: z.string().uuid() });
export const accountParamsSchema = workspaceParamsSchema.extend({
  accountId: z.string().uuid(),
});

export const createAccountSchema = z.object({
  name: z.string().min(1).max(80),
  bankCode: z.string().min(1),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: z.number().int().default(0),
});
export const updateAccountSchema = createAccountSchema.partial();
