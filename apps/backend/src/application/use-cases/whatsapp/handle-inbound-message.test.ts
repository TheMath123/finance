/**
 * Testes do fallback determinístico do pipeline de IA (M2-07) — sem
 * OPENROUTER_API_KEY configurada neste ambiente, toda chamada de IA falha,
 * então esses testes exercitam exatamente o caminho de guardrail que roda
 * quando a IA está fora do ar (ou o orçamento de tokens estourou).
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { createDb, type Db } from '@finance/db';
import { createTestDeps } from '../../../test/deps';
import { register } from '../auth';
import {
  confirmWhatsAppLink,
  handleInboundWhatsAppMessage,
  startWhatsAppLink,
} from '.';

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;
const uniquePhone = () => `+55119${Math.floor(Math.random() * 100_000_000)}`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

/** Usuário recém-registrado já nasce com "Conta principal" (onboarding do M1) — exatamente 1 conta, 0 cartões. */
async function newLinkedUser() {
  const deps = createTestDeps(db);
  const result = await register(deps, {
    name: 'Teste Fallback IA',
    email: uniqueEmail(),
    password: 'senha-forte-123',
  });
  if (!result.ok) throw new Error('falha ao registrar usuário de teste');
  const userId = result.value.user.id;
  const workspaceId = result.value.defaultWorkspaceId;
  const phone = uniquePhone();

  const started = await startWhatsAppLink(deps, userId);
  if (!started.ok) throw new Error('start falhou');
  const confirmed = await confirmWhatsAppLink(deps, phone, started.value.code);
  if (!confirmed.ok) throw new Error('confirm falhou');

  return { deps, userId, workspaceId, phone };
}

describe('handleInboundWhatsAppMessage: fallback determinístico (IA indisponível)', () => {
  test('mensagem óbvia sem conta/cartão ambíguo registra na categoria fallback', async () => {
    const { deps, phone } = await newLinkedUser();

    const reply = await handleInboundWhatsAppMessage(deps, {
      from: phone,
      text: '50 mercado',
    });
    expect(reply.to).toBe(phone);
    expect(reply.body).toMatch(/registrei/i);
    expect(reply.body).toMatch(/outros/i);
  });

  test('texto sem valor reconhecível pede pra usar o app', async () => {
    const { deps, phone } = await newLinkedUser();

    const reply = await handleInboundWhatsAppMessage(deps, {
      from: phone,
      text: 'gastei 50 no mercado',
    });
    expect(reply.body).toMatch(/app/i);
  });

  test('guardrail de orçamento: usuário acima do limite diário cai direto pro fallback', async () => {
    const { deps, userId, phone } = await newLinkedUser();
    // Estoura o orçamento diário manualmente (sem depender do valor exato do limite).
    await deps.tokenBudget.recordUsage(userId, 1_000_000);

    const reply = await handleInboundWhatsAppMessage(deps, {
      from: phone,
      text: '30 farmacia',
    });
    expect(reply.body).toMatch(/limite di[aá]rio/i);
  });
});
