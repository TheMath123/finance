import { INVITE_ROLES } from '@finance/shared';
import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Informe um nome').max(120),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const createInviteSchema = z.object({
  emailOrPhone: z.string().min(3, 'Informe um e-mail ou telefone').max(120),
  role: z.enum(INVITE_ROLES, { error: 'Selecione o papel' }),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
