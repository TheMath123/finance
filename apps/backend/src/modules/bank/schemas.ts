import { z } from "zod";

export const workspaceParamsSchema = z.object({ workspaceId: z.string().uuid() });
export const bankParamsSchema = workspaceParamsSchema.extend({ bankId: z.string().uuid() });

export const createBankSchema = z.object({
  name: z.string().min(1).max(80),
  bankCode: z.string().min(1),
});
export const updateBankSchema = createBankSchema.partial();

export type CreateBankInput = z.infer<typeof createBankSchema>;
export type UpdateBankInput = z.infer<typeof updateBankSchema>;
