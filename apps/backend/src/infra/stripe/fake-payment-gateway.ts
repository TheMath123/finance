import type {
  PaymentEvent,
  PaymentGateway,
} from '../../application/ports/payment-gateway';

/** Gateway fake pra testes — ids determinísticos, nunca chama rede. `constructEvent` não é usado nos testes de use-case: os eventos são construídos diretamente. */
export function createFakePaymentGateway(): PaymentGateway {
  let productSeq = 0;
  let priceSeq = 0;

  return {
    async createProduct() {
      productSeq += 1;
      return { id: `fake_prod_${productSeq}` };
    },
    async createPrice() {
      priceSeq += 1;
      return { id: `fake_price_${priceSeq}` };
    },
    async createCheckoutSession(input) {
      return { url: `https://fake-checkout.test/${input.workspaceId}` };
    },
    async createBillingPortalSession(input) {
      return { url: `https://fake-portal.test/${input.customerId}` };
    },
    async constructEvent(): Promise<PaymentEvent> {
      throw new Error(
        'FakePaymentGateway.constructEvent não é suportado — construa o PaymentEvent diretamente nos testes.'
      );
    },
  };
}
