/**
 * Testes do fluxo completo de auth contra o Postgres local (docker compose).
 * O dispatcher é fake: captura os jobs para extrair tokens de e-mail.
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import {
  bankAccounts,
  banks,
  categories,
  createDb,
  type Db,
  oauthAccounts,
  refreshTokens,
  users,
  workspaceMembers,
  workspaces,
} from '@finance/db';
import { eq } from 'drizzle-orm';
import { updateNameSchema } from '../../../http/modules/auth/schemas';
import { createTestDeps, type DispatchedJob } from '../../../test/deps';
import type { GoogleIdentity } from '../../ports/google-identity-verifier';
import {
  changePassword,
  confirmAccountDeletion,
  confirmEmailChange,
  forgotPassword,
  googleSignIn,
  login,
  logout,
  me,
  refresh,
  register,
  requestAccountDeletion,
  requestEmailChange,
  resetPassword,
  updateName,
  verifyEmail,
  verifyResetCode,
} from '.';

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;

const fakeGoogleIdentity = (overrides: Partial<GoogleIdentity> = {}) => ({
  sub: crypto.randomUUID(),
  email: uniqueEmail(),
  emailVerified: true,
  name: 'Teste Google',
  ...overrides,
});

let db: Db;

beforeAll(() => {
  db = createDb();
});

describe('auth: registro', () => {
  test('cria usuário, workspace pessoal, membership owner e categorias padrão', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const email = uniqueEmail();

    const result = await register(deps, {
      name: 'Teste',
      email,
      password: 'senha-forte-123',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.accessToken).toBeTruthy();
    expect(result.value.refreshToken).toBeTruthy();

    const members = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, result.value.defaultWorkspaceId));
    expect(members).toHaveLength(1);
    expect(members[0]?.role).toBe('owner');

    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.workspaceId, result.value.defaultWorkspaceId));
    expect(cats.length).toBeGreaterThanOrEqual(9);
    expect(cats.some((c) => c.isFallback)).toBe(true);

    expect(jobs.some((j) => j.name === 'email.verify-email')).toBe(true);
  });

  test('nunca cria com platformRole diferente de "user" (superadmin só manual, M4-07)', async () => {
    const deps = createTestDeps(db);
    const result = await register(deps, {
      name: 'Teste',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.user.platformRole).toBe('user');

    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, result.value.user.id));
    expect(row?.platformRole).toBe('user');
  });

  test('cria banco e conta padrão', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();

    const result = await register(deps, {
      name: 'Teste',
      email,
      password: 'senha-forte-123',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const workspaceBanks = await db
      .select()
      .from(banks)
      .where(eq(banks.workspaceId, result.value.defaultWorkspaceId));
    expect(workspaceBanks).toHaveLength(1);

    const workspaceAccounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.workspaceId, result.value.defaultWorkspaceId));
    expect(workspaceAccounts).toHaveLength(1);
    expect(workspaceAccounts[0]?.bankId).toBe(workspaceBanks[0]?.id);
  });

  test('rejeita e-mail duplicado', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const input = { name: 'A', email, password: 'senha-forte-123' };

    expect((await register(deps, input)).ok).toBe(true);
    const second = await register(deps, input);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('email_taken');
  });
});

describe('auth: login social Google', () => {
  test('token inválido/não verificável rejeita', async () => {
    const deps = createTestDeps(db, [], new Map());

    const result = await googleSignIn(deps, {
      idToken: 'token-que-nao-existe-no-fake',
      termsAccepted: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('google_token_invalid');
  });

  test('e-mail não verificado pelo Google rejeita', async () => {
    const identity = fakeGoogleIdentity({ emailVerified: false });
    const deps = createTestDeps(
      db,
      [],
      new Map([['token-nao-verificado', identity]])
    );

    const result = await googleSignIn(deps, {
      idToken: 'token-nao-verificado',
      termsAccepted: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('google_email_unverified');
  });

  test('e-mail já cadastrado por senha rejeita com google_email_registered', async () => {
    const email = uniqueEmail();
    const deps = createTestDeps(db);
    expect(
      (
        await register(deps, {
          name: 'Já tem senha',
          email,
          password: 'senha-forte-123',
        })
      ).ok
    ).toBe(true);

    const identity = fakeGoogleIdentity({ email });
    const googleDeps = createTestDeps(
      db,
      [],
      new Map([['token-email-existente', identity]])
    );
    const result = await googleSignIn(googleDeps, {
      idToken: 'token-email-existente',
      termsAccepted: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('google_email_registered');
  });

  test('usuário novo: cria conta, workspace pessoal, vínculo oauth e e-mail já verificado', async () => {
    const identity = fakeGoogleIdentity();
    const deps = createTestDeps(
      db,
      [],
      new Map([['token-usuario-novo', identity]])
    );

    const result = await googleSignIn(deps, {
      idToken: 'token-usuario-novo',
      termsAccepted: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.accessToken).toBeTruthy();
    expect(result.value.user.emailVerifiedAt).toBeTruthy();
    expect(result.value.user.email).toBe(identity.email);

    const members = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, result.value.defaultWorkspaceId));
    expect(members).toHaveLength(1);
    expect(members[0]?.role).toBe('owner');

    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.workspaceId, result.value.defaultWorkspaceId));
    expect(cats.length).toBeGreaterThanOrEqual(9);

    const workspaceBanks = await db
      .select()
      .from(banks)
      .where(eq(banks.workspaceId, result.value.defaultWorkspaceId));
    expect(workspaceBanks).toHaveLength(1);

    const linked = await db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.providerAccountId, identity.sub));
    expect(linked).toHaveLength(1);
    expect(linked[0]?.provider).toBe('google');
    expect(linked[0]?.userId).toBe(result.value.user.id);

    // Confirma que o e-mail já sai marcado como verificado no banco, não só na sessão
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, result.value.user.id));
    expect(row?.emailVerifiedAt).toBeTruthy();
  });

  test('usuário Google já vinculado: login de retorno na mesma conta/workspace', async () => {
    const identity = fakeGoogleIdentity();
    const deps = createTestDeps(
      db,
      [],
      new Map([['token-primeiro-login', identity]])
    );

    const first = await googleSignIn(deps, {
      idToken: 'token-primeiro-login',
      termsAccepted: true,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // Novo ID token (o do Google muda a cada login), mesmo `sub` — mesmo fake resolve os dois.
    const returnDeps = createTestDeps(
      db,
      [],
      new Map([['token-segundo-login', identity]])
    );
    const second = await googleSignIn(returnDeps, {
      idToken: 'token-segundo-login',
      termsAccepted: true,
    });

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.user.id).toBe(first.value.user.id);
    expect(second.value.defaultWorkspaceId).toBe(
      first.value.defaultWorkspaceId
    );

    const linked = await db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.providerAccountId, identity.sub));
    expect(linked).toHaveLength(1);
  });

  test('conta Google suspensa rejeita login de retorno', async () => {
    const identity = fakeGoogleIdentity();
    const deps = createTestDeps(
      db,
      [],
      new Map([['token-primeiro-login-susp', identity]])
    );
    const first = await googleSignIn(deps, {
      idToken: 'token-primeiro-login-susp',
      termsAccepted: true,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    await db
      .update(users)
      .set({ suspendedAt: new Date() })
      .where(eq(users.id, first.value.user.id));

    const returnDeps = createTestDeps(
      db,
      [],
      new Map([['token-segundo-login-susp', identity]])
    );
    const second = await googleSignIn(returnDeps, {
      idToken: 'token-segundo-login-susp',
      termsAccepted: true,
    });

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('account_suspended');
  });
});

describe('auth: login e refresh', () => {
  test('login com credenciais válidas; senha errada falha', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    await register(deps, { name: 'B', email, password: 'senha-forte-123' });

    const ok = await login(deps, { email, password: 'senha-forte-123' });
    expect(ok.ok).toBe(true);

    const bad = await login(deps, { email, password: 'senha-errada-000' });
    expect(bad.ok).toBe(false);
  });

  test('refresh rotaciona: o token antigo deixa de valer', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const session = await register(deps, {
      name: 'C',
      email,
      password: 'senha-forte-123',
    });
    if (!session.ok) throw new Error('registro falhou');

    const first = await refresh(deps, {
      refreshToken: session.value.refreshToken,
    });
    expect(first.ok).toBe(true);

    // Reuso do token antigo deve falhar (rotação)
    const reuse = await refresh(deps, {
      refreshToken: session.value.refreshToken,
    });
    expect(reuse.ok).toBe(false);
  });

  test('logout revoga o refresh token', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const session = await register(deps, {
      name: 'D',
      email,
      password: 'senha-forte-123',
    });
    if (!session.ok) throw new Error('registro falhou');

    await logout(deps, { refreshToken: session.value.refreshToken });
    const after = await refresh(deps, {
      refreshToken: session.value.refreshToken,
    });
    expect(after.ok).toBe(false);
  });

  test('me retorna os dados do usuário autenticado', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const session = await register(deps, {
      name: 'E',
      email,
      password: 'senha-forte-123',
    });
    if (!session.ok) throw new Error('registro falhou');

    const result = await me(deps, session.value.user.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.user.email).toBe(email);
    expect(result.value.defaultWorkspaceId).toBe(
      session.value.defaultWorkspaceId
    );
  });
});

describe('auth: verificação de e-mail e reset de senha', () => {
  test('fluxo completo: verificar e-mail → forgot → reset → sessões revogadas → login com nova senha', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const email = uniqueEmail();

    const session = await register(deps, {
      name: 'E',
      email,
      password: 'senha-original-123',
    });
    if (!session.ok) throw new Error('registro falhou');

    // verifica o e-mail com o token capturado do job
    const verifyJob = jobs.find((j) => j.name === 'email.verify-email');
    if (!verifyJob) throw new Error('job de verificação não disparado');
    const verifyToken = (verifyJob.payload as { code: string }).code;
    expect((await verifyEmail(deps, { token: verifyToken })).ok).toBe(true);
    // token de verificação é single-use
    expect((await verifyEmail(deps, { token: verifyToken })).ok).toBe(false);

    // agora o forgot envia o e-mail de reset
    await forgotPassword(deps, { email });
    const resetJob = jobs.find((j) => j.name === 'email.password-reset');
    if (!resetJob) throw new Error('job de reset não disparado');
    const resetCode = (resetJob.payload as { code: string }).code;

    // verify-reset-code não consome o código (é só uma checagem)
    expect((await verifyResetCode(deps, { email, code: resetCode })).ok).toBe(
      true
    );
    expect((await verifyResetCode(deps, { email, code: resetCode })).ok).toBe(
      true
    );

    const reset = await resetPassword(deps, {
      email,
      code: resetCode,
      password: 'senha-nova-456',
    });
    expect(reset.ok).toBe(true);

    // reset é single-use
    expect(
      (
        await resetPassword(deps, {
          email,
          code: resetCode,
          password: 'outra-789xx',
        })
      ).ok
    ).toBe(false);

    // todas as sessões foram revogadas
    const remaining = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, session.value.user.id));
    expect(remaining).toHaveLength(0);

    // senha antiga não funciona; nova funciona
    expect(
      (await login(deps, { email, password: 'senha-original-123' })).ok
    ).toBe(false);
    expect((await login(deps, { email, password: 'senha-nova-456' })).ok).toBe(
      true
    );

    // e-mail de "senha alterada" foi disparado
    expect(jobs.some((j) => j.name === 'email.password-changed')).toBe(true);
  });

  test('código de reset inválido falha', async () => {
    const deps = createTestDeps(db);
    const result = await resetPassword(deps, {
      email: uniqueEmail(),
      code: '000000',
      password: '12345678',
    });
    expect(result.ok).toBe(false);
  });

  test('forgot-password numa conta não verificada responde genérico, mas não envia e-mail', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const email = uniqueEmail();

    const session = await register(deps, {
      name: 'Não verificado',
      email,
      password: 'senha-original-123',
    });
    if (!session.ok) throw new Error('registro falhou');

    const result = await forgotPassword(deps, { email });
    expect(result.ok).toBe(true);
    expect(jobs.filter((j) => j.name === 'email.password-reset')).toHaveLength(
      0
    );
  });

  test('forgot-password: segundo pedido pro mesmo e-mail dentro do cooldown de 10min não envia outro e-mail', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const email = uniqueEmail();

    const session = await register(deps, {
      name: 'Cooldown',
      email,
      password: 'senha-original-123',
    });
    if (!session.ok) throw new Error('registro falhou');
    const verifyJob = jobs.find((j) => j.name === 'email.verify-email');
    if (!verifyJob) throw new Error('job de verificação não disparado');
    const verifyToken = (verifyJob.payload as { code: string }).code;
    expect((await verifyEmail(deps, { token: verifyToken })).ok).toBe(true);

    await forgotPassword(deps, { email });
    expect(jobs.filter((j) => j.name === 'email.password-reset')).toHaveLength(
      1
    );

    // Pedido imediato seguinte cai no cooldown — resposta continua genérica,
    // mas nenhum e-mail novo é disparado (evita spammar a caixa da vítima).
    await forgotPassword(deps, { email });
    expect(jobs.filter((j) => j.name === 'email.password-reset')).toHaveLength(
      1
    );
  });
});

describe('auth: lockout progressivo', () => {
  test('5 falhas travam a conta (mesmo com a senha certa), e-mail de aviso é disparado e o reset destrava', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const email = uniqueEmail();
    await register(deps, { name: 'L', email, password: 'senha-certa-123' });

    for (let i = 0; i < 5; i++) {
      const attempt = await login(deps, {
        email,
        password: 'senha-errada-000',
      });
      expect(attempt.ok).toBe(false);
    }
    // e-mail de atividade suspeita disparado no lockout
    expect(jobs.some((j) => j.name === 'email.account-locked')).toBe(true);

    // conta travada: senha CERTA também falha, com o mesmo erro genérico
    const locked = await login(deps, { email, password: 'senha-certa-123' });
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.error).toBe('invalid_credentials');

    // reset de senha zera o lockout: verifica e-mail, pede reset e redefine
    const verifyJob = jobs.find((j) => j.name === 'email.verify-email');
    if (!verifyJob) throw new Error('job de verificação não disparado');
    const verifyToken = (verifyJob.payload as { code: string }).code;
    expect((await verifyEmail(deps, { token: verifyToken })).ok).toBe(true);
    await forgotPassword(deps, { email });
    const resetJob = jobs.find((j) => j.name === 'email.password-reset');
    if (!resetJob) throw new Error('job de reset não disparado');
    const resetCode = (resetJob.payload as { code: string }).code;
    expect(
      (
        await resetPassword(deps, {
          email,
          code: resetCode,
          password: 'senha-nova-456',
        })
      ).ok
    ).toBe(true);

    // destravada: login com a nova senha funciona imediatamente
    expect((await login(deps, { email, password: 'senha-nova-456' })).ok).toBe(
      true
    );
  });
});

describe('auth: exclusão de conta (LGPD)', () => {
  test('senha errada no pedido falha; senha certa manda código pro próprio e-mail; código certo apaga usuário e workspace pessoal', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const email = uniqueEmail();
    const session = await register(deps, {
      name: 'F',
      email,
      password: 'senha-forte-123',
    });
    if (!session.ok) throw new Error('registro falhou');
    const { user, defaultWorkspaceId } = session.value;

    const wrongPassword = await requestAccountDeletion(deps, {
      userId: user.id,
      password: 'senha-errada-000',
    });
    expect(wrongPassword.ok).toBe(false);
    if (!wrongPassword.ok)
      expect(wrongPassword.error).toBe('invalid_credentials');
    expect(
      jobs.filter((j) => j.name === 'email.confirm-account-deletion')
    ).toHaveLength(0);

    const requested = await requestAccountDeletion(deps, {
      userId: user.id,
      password: 'senha-forte-123',
    });
    expect(requested.ok).toBe(true);

    const codeJob = jobs.find(
      (j) => j.name === 'email.confirm-account-deletion'
    );
    if (!codeJob) throw new Error('job de confirmação não disparado');
    expect(codeJob.payload).toMatchObject({ to: email });
    const code = (codeJob.payload as { code: string }).code;

    // ainda existe após o pedido — só o código confirmado apaga de fato
    expect(
      await db.query.users.findFirst({ where: eq(users.id, user.id) })
    ).toBeDefined();

    const wrongCode = code === '000000' ? '111111' : '000000';
    const wrong = await confirmAccountDeletion(deps, {
      userId: user.id,
      code: wrongCode,
    });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toBe('invalid_code');
    expect(
      await db.query.users.findFirst({ where: eq(users.id, user.id) })
    ).toBeDefined();

    const ok = await confirmAccountDeletion(deps, { userId: user.id, code });
    expect(ok.ok).toBe(true);

    expect(
      await db.query.users.findFirst({ where: eq(users.id, user.id) })
    ).toBeUndefined();
    expect(
      await db.query.workspaces.findFirst({
        where: eq(workspaces.id, defaultWorkspaceId),
      })
    ).toBeUndefined();
  });

  test('5 reautenticações erradas travam a conta pro mesmo lockout do login (auditoria 2026-07-19)', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const session = await register(deps, {
      name: 'L2',
      email,
      password: 'senha-forte-123',
    });
    if (!session.ok) throw new Error('registro falhou');
    const { user } = session.value;

    for (let i = 0; i < 5; i++) {
      const attempt = await requestAccountDeletion(deps, {
        userId: user.id,
        password: 'senha-errada-000',
      });
      expect(attempt.ok).toBe(false);
    }

    // conta travada: mesmo a senha CERTA falha agora, tanto na reautenticação...
    const lockedRequest = await requestAccountDeletion(deps, {
      userId: user.id,
      password: 'senha-forte-123',
    });
    expect(lockedRequest.ok).toBe(false);
    // ...quanto no login normal — o lockout é compartilhado (mesma proteção contra força bruta).
    const lockedLogin = await login(deps, {
      email,
      password: 'senha-forte-123',
    });
    expect(lockedLogin.ok).toBe(false);

    // usuário não foi excluído
    expect(
      await db.query.users.findFirst({ where: eq(users.id, user.id) })
    ).toBeDefined();
  });

  test('nunca confirma a exclusão de outro usuário — código de A não vale pro userId de B', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const a = await register(deps, {
      name: 'S',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    const b = await register(deps, {
      name: 'T',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    if (!a.ok || !b.ok) throw new Error('registro falhou');

    const requested = await requestAccountDeletion(deps, {
      userId: a.value.user.id,
      password: 'senha-forte-123',
    });
    expect(requested.ok).toBe(true);

    const bAttempt = await confirmAccountDeletion(deps, {
      userId: b.value.user.id,
      code: '000000',
    });
    expect(bAttempt.ok).toBe(false);
    if (!bAttempt.ok) expect(bAttempt.error).toBe('invalid_code');

    // ambos continuam existindo
    expect(
      await db.query.users.findFirst({ where: eq(users.id, a.value.user.id) })
    ).toBeDefined();
    expect(
      await db.query.users.findFirst({ where: eq(users.id, b.value.user.id) })
    ).toBeDefined();
  });

  test('rate limit: 6º pedido de exclusão na mesma hora é bloqueado', async () => {
    const deps = createTestDeps(db);
    const session = await register(deps, {
      name: 'U',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    if (!session.ok) throw new Error('registro falhou');
    const { user } = session.value;

    let last;
    for (let i = 0; i < 6; i++) {
      last = await requestAccountDeletion(deps, {
        userId: user.id,
        password: 'senha-forte-123',
      });
    }
    expect(last?.ok).toBe(false);
    if (last && !last.ok) expect(last.error).toBe('rate_limited');
  });
});

describe('auth: edição de perfil — nome', () => {
  test('altera só o próprio nome; o registro de outro usuário nunca é tocado', async () => {
    const deps = createTestDeps(db);
    const a = await register(deps, {
      name: 'Ana',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    const b = await register(deps, {
      name: 'Bruno',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    if (!a.ok || !b.ok) throw new Error('registro falhou');

    // userId sempre vem do JWT (guard) — a use-case nem tem um campo "targetUserId"
    // pra um cliente malicioso mirar noutro usuário.
    const result = await updateName(deps, {
      userId: a.value.user.id,
      name: 'Ana Nova',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Ana Nova');

    const freshA = await db.query.users.findFirst({
      where: eq(users.id, a.value.user.id),
    });
    const freshB = await db.query.users.findFirst({
      where: eq(users.id, b.value.user.id),
    });
    expect(freshA?.name).toBe('Ana Nova');
    expect(freshB?.name).toBe('Bruno');

    // Prova estrutural: o schema HTTP do PATCH /auth/me não declara um campo de
    // usuário-alvo — mesmo que o cliente envie um "userId" no body tentando
    // mirar outra conta, o Zod descarta silenciosamente (não é um campo do
    // schema), então o valor nunca chega na use-case.
    const parsed = updateNameSchema.safeParse({
      name: 'Invasão',
      userId: b.value.user.id,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && 'userId' in parsed.data).toBe(false);
  });
});

describe('auth: edição de perfil — troca de senha', () => {
  test('senha atual errada falha genérico (invalid_credentials); senha certa troca e revoga sessões', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const email = uniqueEmail();
    const session = await register(deps, {
      name: 'G',
      email,
      password: 'senha-original-123',
    });
    if (!session.ok) throw new Error('registro falhou');
    const { user } = session.value;

    const wrong = await changePassword(deps, {
      userId: user.id,
      currentPassword: 'senha-errada-000',
      newPassword: 'senha-nova-456',
    });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toBe('invalid_credentials');

    const ok = await changePassword(deps, {
      userId: user.id,
      currentPassword: 'senha-original-123',
      newPassword: 'senha-nova-456',
    });
    expect(ok.ok).toBe(true);

    // todas as sessões foram revogadas (sem currentRefreshToken informado)
    const remaining = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, user.id));
    expect(remaining).toHaveLength(0);

    expect(
      (await login(deps, { email, password: 'senha-original-123' })).ok
    ).toBe(false);
    expect((await login(deps, { email, password: 'senha-nova-456' })).ok).toBe(
      true
    );
    expect(jobs.some((j) => j.name === 'email.password-changed')).toBe(true);
  });

  test('com currentRefreshToken informado, só as OUTRAS sessões são revogadas', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const session = await register(deps, {
      name: 'H',
      email,
      password: 'senha-original-123',
    });
    if (!session.ok) throw new Error('registro falhou');
    const { user, refreshToken: currentSession } = session.value;

    // segunda sessão (ex.: outro aparelho) — deve ser revogada
    const otherLogin = await login(deps, {
      email,
      password: 'senha-original-123',
    });
    if (!otherLogin.ok) throw new Error('login falhou');

    const ok = await changePassword(deps, {
      userId: user.id,
      currentPassword: 'senha-original-123',
      newPassword: 'senha-nova-456',
      currentRefreshToken: currentSession,
    });
    expect(ok.ok).toBe(true);

    // sessão atual sobrevive
    expect((await refresh(deps, { refreshToken: currentSession })).ok).toBe(
      true
    );
    // a outra sessão foi revogada
    expect(
      (await refresh(deps, { refreshToken: otherLogin.value.refreshToken })).ok
    ).toBe(false);
  });

  test('nunca altera a senha de outro usuário — reautenticação é por conta, não por userId solto', async () => {
    const deps = createTestDeps(db);
    const a = await register(deps, {
      name: 'I',
      email: uniqueEmail(),
      password: 'senha-de-a-123',
    });
    const b = await register(deps, {
      name: 'J',
      email: uniqueEmail(),
      password: 'senha-de-b-123',
    });
    if (!a.ok || !b.ok) throw new Error('registro falhou');

    // Mesmo que o userId de B "vazasse" pra cá (ex.: bug hipotético no guard), a
    // reautenticação por senha ainda barra: A não conhece a senha de B.
    const attempt = await changePassword(deps, {
      userId: b.value.user.id,
      currentPassword: 'senha-de-a-123',
      newPassword: 'senha-hackeada-999',
    });
    expect(attempt.ok).toBe(false);
    if (!attempt.ok) expect(attempt.error).toBe('invalid_credentials');

    // senha de B continua a original
    expect(
      (
        await login(deps, {
          email: b.value.user.email,
          password: 'senha-de-b-123',
        })
      ).ok
    ).toBe(true);
  });
});

describe('auth: edição de perfil — troca de e-mail', () => {
  test('e-mail novo já em uso por outro usuário é rejeitado ANTES de mandar qualquer código', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const a = await register(deps, {
      name: 'K',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    const b = await register(deps, {
      name: 'L',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    if (!a.ok || !b.ok) throw new Error('registro falhou');

    const result = await requestEmailChange(deps, {
      userId: a.value.user.id,
      newEmail: b.value.user.email,
      currentPassword: 'senha-forte-123',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('email_already_in_use');
    expect(
      jobs.filter((j) => j.name === 'email.confirm-email-change')
    ).toHaveLength(0);
  });

  test('fluxo completo: pede troca → código errado falha → código certo confirma, marca emailVerifiedAt e avisa o e-mail antigo', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const oldEmail = uniqueEmail();
    const newEmail = uniqueEmail();
    const session = await register(deps, {
      name: 'M',
      email: oldEmail,
      password: 'senha-forte-123',
    });
    if (!session.ok) throw new Error('registro falhou');
    const { user } = session.value;

    const requested = await requestEmailChange(deps, {
      userId: user.id,
      newEmail,
      currentPassword: 'senha-forte-123',
    });
    expect(requested.ok).toBe(true);

    // senha atual errada bloqueia o pedido (auditoria 2026-07-20 — antes só o
    // access token bastava; agora exige a mesma reautenticação da troca de senha)
    const wrongPassword = await requestEmailChange(deps, {
      userId: user.id,
      newEmail: uniqueEmail(),
      currentPassword: 'senha-errada-000',
    });
    expect(wrongPassword.ok).toBe(false);
    if (!wrongPassword.ok)
      expect(wrongPassword.error).toBe('invalid_credentials');

    const codeJob = jobs.find((j) => j.name === 'email.confirm-email-change');
    if (!codeJob) throw new Error('job de confirmação não disparado');
    const code = (codeJob.payload as { code: string }).code;
    expect(codeJob.payload).toMatchObject({ to: newEmail });

    const wrongCode = code === '000000' ? '111111' : '000000';
    const wrong = await confirmEmailChange(deps, {
      userId: user.id,
      code: wrongCode,
    });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toBe('invalid_code');

    const confirmed = await confirmEmailChange(deps, { userId: user.id, code });
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) expect(confirmed.value.email).toBe(newEmail);

    const fresh = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });
    expect(fresh?.email).toBe(newEmail);
    expect(fresh?.pendingEmail).toBeNull();
    expect(fresh?.emailVerifiedAt).toBeTruthy();

    // e-mail ANTIGO recebeu o aviso de segurança
    const changedNotice = jobs.find((j) => j.name === 'email.email-changed');
    expect(changedNotice).toBeDefined();
    expect(changedNotice?.payload).toMatchObject({ to: oldEmail, newEmail });

    // código já usado (e sem pendência) não confirma de novo
    const reuse = await confirmEmailChange(deps, { userId: user.id, code });
    expect(reuse.ok).toBe(false);
    if (!reuse.ok) expect(reuse.error).toBe('no_pending_email_change');

    // login com o e-mail novo funciona
    expect(
      (await login(deps, { email: newEmail, password: 'senha-forte-123' })).ok
    ).toBe(true);
  });

  test('código expirado falha', async () => {
    const deps = createTestDeps(db);
    const session = await register(deps, {
      name: 'N',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    if (!session.ok) throw new Error('registro falhou');
    const { user } = session.value;
    const newEmail = uniqueEmail();

    await deps.repos.user.setPendingEmail(user.id, newEmail);
    const generated = deps.tokens.generateCode();
    await deps.repos.token.createAuthToken({
      userId: user.id,
      purpose: 'email_change',
      tokenHash: generated.hash,
      expiresAt: new Date(Date.now() - 1_000), // já expirado
    });

    const result = await confirmEmailChange(deps, {
      userId: user.id,
      code: generated.raw,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_code');
  });

  test('nunca troca o e-mail de outro usuário — cada pedido/confirmação é escopado ao próprio userId', async () => {
    const deps = createTestDeps(db);
    const a = await register(deps, {
      name: 'O',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    const b = await register(deps, {
      name: 'P',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    if (!a.ok || !b.ok) throw new Error('registro falhou');

    const requested = await requestEmailChange(deps, {
      userId: a.value.user.id,
      newEmail: uniqueEmail(),
      currentPassword: 'senha-forte-123',
    });
    expect(requested.ok).toBe(true);

    // B não tem pendência própria — confirmar com o userId de B falha, mesmo que
    // B de alguma forma soubesse o código gerado pro pedido de A (o código de A
    // só é válido pra `findValidAuthTokenForUser(a.id, ...)`, nunca pro de B).
    const freshA = await db.query.users.findFirst({
      where: eq(users.id, a.value.user.id),
    });
    const bAttempt = await confirmEmailChange(deps, {
      userId: b.value.user.id,
      code: '000000',
    });
    expect(bAttempt.ok).toBe(false);
    if (!bAttempt.ok) expect(bAttempt.error).toBe('no_pending_email_change');

    // e-mail de B continua o mesmo
    const freshB = await db.query.users.findFirst({
      where: eq(users.id, b.value.user.id),
    });
    expect(freshB?.email).toBe(b.value.user.email);
    expect(freshA?.pendingEmail).toBeTruthy();
  });

  test('rate limit: 6º pedido de troca de e-mail na mesma hora é bloqueado', async () => {
    const deps = createTestDeps(db);
    const session = await register(deps, {
      name: 'Q',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    if (!session.ok) throw new Error('registro falhou');
    const { user } = session.value;

    let last;
    for (let i = 0; i < 6; i++) {
      last = await requestEmailChange(deps, {
        userId: user.id,
        newEmail: uniqueEmail(),
        currentPassword: 'senha-forte-123',
      });
    }
    expect(last?.ok).toBe(false);
    if (last && !last.ok) expect(last.error).toBe('rate_limited');
  });
});
