/**
 * Testes do vínculo do WhatsApp por OTP (M2-05) contra o Postgres local.
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { createDb, type Db } from '@finance/db';
import { createTestDeps } from '../../../test/deps';
import { register } from '../auth';
import { listNotifications } from '../notification';
import {
  confirmWhatsAppLink,
  handleInboundWhatsAppMessage,
  revokeWhatsAppLink,
  startWhatsAppLink,
} from '.';

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;
const uniquePhone = () => `+55119${Math.floor(Math.random() * 100_000_000)}`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

async function newUser() {
  const deps = createTestDeps(db);
  const result = await register(deps, {
    name: 'Usuário WhatsApp',
    email: uniqueEmail(),
    password: 'senha-forte-123',
  });
  if (!result.ok) throw new Error('falha ao registrar usuário de teste');
  return result.value.user;
}

describe('whatsapp: início do vínculo', () => {
  test('gera código de 6 dígitos e respeita rate limit', async () => {
    const deps = createTestDeps(db);
    const user = await newUser();

    const started = await startWhatsAppLink(deps, user.id);
    expect(started.ok).toBe(true);
    if (started.ok) expect(started.value.code).toMatch(/^\d{6}$/);

    // 3 chamadas já consumidas (a de cima + mais 2) — a 4ª deve ser limitada.
    await startWhatsAppLink(deps, user.id);
    await startWhatsAppLink(deps, user.id);
    const throttled = await startWhatsAppLink(deps, user.id);
    expect(throttled.ok).toBe(false);
    if (!throttled.ok) expect(throttled.error).toBe('rate_limited');
  });
});

describe('whatsapp: confirmação do vínculo', () => {
  test('código correto vincula o telefone e notifica', async () => {
    const deps = createTestDeps(db);
    const user = await newUser();
    const phone = uniquePhone();

    const started = await startWhatsAppLink(deps, user.id);
    if (!started.ok) throw new Error('start falhou');

    const confirmed = await confirmWhatsAppLink(
      deps,
      phone,
      started.value.code
    );
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.value.userId).toBe(user.id);
      expect(confirmed.value.workspaceName).toBe('Pessoal');
    }

    const stored = await deps.repos.user.findByPhone(phone);
    expect(stored?.id).toBe(user.id);

    const notifications = await listNotifications(deps, user.id, false);
    expect(notifications.some((n) => n.type === 'whatsapp_linked')).toBe(true);
  });

  test('código errado não vincula nada', async () => {
    const deps = createTestDeps(db);
    const user = await newUser();
    const phone = uniquePhone();

    const started = await startWhatsAppLink(deps, user.id);
    if (!started.ok) throw new Error('start falhou');
    const wrongCode = started.value.code === '000000' ? '111111' : '000000';

    const confirmed = await confirmWhatsAppLink(deps, phone, wrongCode);
    expect(confirmed.ok).toBe(false);
    if (!confirmed.ok) expect(confirmed.error).toBe('invalid_code');

    const stored = await deps.repos.user.findByPhone(phone);
    expect(stored).toBeUndefined();
  });

  test('código já usado não pode ser reutilizado', async () => {
    const deps = createTestDeps(db);
    const user = await newUser();
    const phone = uniquePhone();

    const started = await startWhatsAppLink(deps, user.id);
    if (!started.ok) throw new Error('start falhou');

    const first = await confirmWhatsAppLink(deps, phone, started.value.code);
    expect(first.ok).toBe(true);

    const second = await confirmWhatsAppLink(
      deps,
      uniquePhone(),
      started.value.code
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('invalid_code');
  });

  test('telefone já vinculado a outro usuário é rejeitado', async () => {
    const deps = createTestDeps(db);
    const owner = await newUser();
    const intruder = await newUser();
    const phone = uniquePhone();

    const ownerStart = await startWhatsAppLink(deps, owner.id);
    if (!ownerStart.ok) throw new Error('start falhou');
    const ownerConfirm = await confirmWhatsAppLink(
      deps,
      phone,
      ownerStart.value.code
    );
    expect(ownerConfirm.ok).toBe(true);

    const intruderStart = await startWhatsAppLink(deps, intruder.id);
    if (!intruderStart.ok) throw new Error('start falhou');
    const intruderConfirm = await confirmWhatsAppLink(
      deps,
      phone,
      intruderStart.value.code
    );
    expect(intruderConfirm.ok).toBe(false);
    if (!intruderConfirm.ok)
      expect(intruderConfirm.error).toBe('phone_already_linked');
  });

  test('rate limit por telefone bloqueia tentativas repetidas', async () => {
    const deps = createTestDeps(db);
    const phone = uniquePhone();

    await confirmWhatsAppLink(deps, phone, '000001');
    await confirmWhatsAppLink(deps, phone, '000002');
    await confirmWhatsAppLink(deps, phone, '000003');
    const fourth = await confirmWhatsAppLink(deps, phone, '000004');
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.error).toBe('rate_limited');
  });
});

describe('whatsapp: roteamento de mensagem recebida (M2-06)', () => {
  test('número não vinculado + código de 6 dígitos confirma o vínculo', async () => {
    const deps = createTestDeps(db);
    const user = await newUser();
    const phone = uniquePhone();

    const started = await startWhatsAppLink(deps, user.id);
    if (!started.ok) throw new Error('start falhou');

    const reply = await handleInboundWhatsAppMessage(deps, {
      from: phone,
      text: started.value.code,
    });
    expect(reply.to).toBe(phone);
    expect(reply.body).toMatch(/vínculo confirmado/i);

    const stored = await deps.repos.user.findByPhone(phone);
    expect(stored?.id).toBe(user.id);
  });

  test('número não vinculado + código errado não vincula e avisa', async () => {
    const deps = createTestDeps(db);
    const phone = uniquePhone();

    const reply = await handleInboundWhatsAppMessage(deps, {
      from: phone,
      text: '000000',
    });
    expect(reply.body).toMatch(/inválido|expirado/i);
  });

  test('número não vinculado + texto qualquer só recebe instrução de vínculo', async () => {
    const deps = createTestDeps(db);
    const phone = uniquePhone();

    const reply = await handleInboundWhatsAppMessage(deps, {
      from: phone,
      text: 'gastei 50 no mercado',
    });
    expect(reply.body).toMatch(/não está vinculado/i);
  });

  test('número já vinculado recebe resposta de placeholder (M2-07 fora de escopo)', async () => {
    const deps = createTestDeps(db);
    const user = await newUser();
    const phone = uniquePhone();
    const started = await startWhatsAppLink(deps, user.id);
    if (!started.ok) throw new Error('start falhou');
    await confirmWhatsAppLink(deps, phone, started.value.code);

    const reply = await handleInboundWhatsAppMessage(deps, {
      from: phone,
      text: 'gastei 50 no mercado',
    });
    expect(reply.to).toBe(phone);
    expect(reply.body.length).toBeGreaterThan(0);
  });
});

describe('whatsapp: revogação do vínculo', () => {
  test('revoga o telefone vinculado', async () => {
    const deps = createTestDeps(db);
    const user = await newUser();
    const phone = uniquePhone();

    const started = await startWhatsAppLink(deps, user.id);
    if (!started.ok) throw new Error('start falhou');
    await confirmWhatsAppLink(deps, phone, started.value.code);

    await revokeWhatsAppLink(deps, user.id);

    const stored = await deps.repos.user.findByPhone(phone);
    expect(stored).toBeUndefined();
  });
});
