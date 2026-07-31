import { z } from 'zod';

export const billingWorkspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

// `.url()` seria restrito demais aqui — o mobile manda um deep link com
// scheme customizado (ex. `financeguide://billing-return`), não http(s).
export const startCheckoutSchema = z.object({
  planId: z.string().uuid(),
  planPriceId: z.string().uuid(),
  successUrl: z.string().min(1).max(2000),
  cancelUrl: z.string().min(1).max(2000),
});

export const startBillingPortalSchema = z.object({
  returnUrl: z.string().min(1).max(2000),
});
