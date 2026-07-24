import { z } from 'zod';

export const workspaceTransactionParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  transactionId: z.string().uuid(),
});
export const splitParamsSchema = z.object({ id: z.string().uuid() });
export const shareParamsSchema = z.object({ id: z.string().uuid() });

const participantSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('user'),
    /** Telefone ou e-mail de um usuário existente na plataforma. */
    contact: z.string().min(3).max(320),
    amount: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('external'),
    name: z.string().min(1).max(120),
    amount: z.number().int().positive().optional(),
  }),
]);

export const createSplitSchema = z.object({
  participants: z.array(participantSchema).min(1).max(20),
});
