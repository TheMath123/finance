/**
 * Guard de superadmin (M4-07) contra o Postgres local (docker compose) —
 * mesmo padrão de auth.test.ts.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
  adminAuditLogs,
  createDb,
  type Db,
  users,
  workspaces,
} from '@finance/db';
import { eq } from 'drizzle-orm';
import { createPlan } from '../application/use-cases/admin';
import { register } from '../application/use-cases/auth';
import {
  acceptInvite,
  createInvite,
  createWorkspace,
} from '../application/use-cases/workspace';
import { cleanupTestPlans } from '../test/cleanup-test-plans';
import { createTestDeps, getTestPlanId } from '../test/deps';
import { requireSuperadmin, requireWorkspaceRole } from './guards';

const uniqueEmail = () => `test-guard-${crypto.randomUUID()}@test.local`;
const uniquePlanKey = () =>
  `test-guard-plan-${crypto.randomUUID().slice(0, 8)}`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

afterAll(async () => {
  await cleanupTestPlans(db, ['test-guard-plan-'], ['test-guard-']);
});

function bearerRequest(token: string) {
  return new Request('http://test.local/admin', {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe('requireSuperadmin', () => {
  test('rejeita (403) usuário comum', async () => {
    const deps = createTestDeps(db);
    const result = await register(deps, {
      name: 'Usuário Comum',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const auth = await requireSuperadmin(
      deps,
      bearerRequest(result.value.accessToken)
    );
    expect(auth.ok).toBe(false);
    if (auth.ok) return;
    expect(auth.error.status).toBe(403);
  });

  test('libera acesso e registra em admin_audit_logs após promoção manual', async () => {
    const deps = createTestDeps(db);
    const result = await register(deps, {
      name: 'Futuro Superadmin',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const userId = result.value.user.id;

    // Promoção só acontece manualmente no banco — nunca via API (spec).
    await db
      .update(users)
      .set({ platformRole: 'superadmin' })
      .where(eq(users.id, userId));

    const auth = await requireSuperadmin(
      deps,
      bearerRequest(result.value.accessToken)
    );
    expect(auth.ok).toBe(true);
    if (!auth.ok) return;
    expect(auth.value.userId).toBe(userId);

    await deps.repos.adminAudit.record({
      adminUserId: userId,
      action: 'test_action',
      entity: 'test_entity',
      entityId: 'test-id',
    });

    const rows = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.adminUserId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe('test_action');
    expect(rows[0]?.entity).toBe('test_entity');
  });
});

/** Registra + verifica e-mail (aceitar convite exige `emailVerifiedAt`) e devolve token/userId. */
async function registerVerified(deps: ReturnType<typeof createTestDeps>) {
  const result = await register(deps, {
    name: `Teste ${crypto.randomUUID().slice(0, 8)}`,
    email: uniqueEmail(),
    password: 'senha-forte-123',
  });
  if (!result.ok) throw new Error('falha ao registrar usuário de teste');
  await deps.repos.user.markEmailVerified(result.value.user.id);
  return {
    userId: result.value.user.id,
    accessToken: result.value.accessToken,
  };
}

describe('requireWorkspaceRole — downgrade enforcement (plan-enforcement)', () => {
  test('workspace acima da quota do dono: dono mantém acesso total, membro vira só leitura', async () => {
    const deps = createTestDeps(db);
    const owner = await registerVerified(deps);

    const first = await createWorkspace(deps, owner.userId, {
      name: 'Workspace A',
    });
    if (!first.ok) throw new Error('setup falhou');

    // Upgrade temporário libera a quota (5) pra criar o segundo.
    const premiumPlanId = await getTestPlanId(db, 'premium');
    await db
      .update(workspaces)
      .set({ planId: premiumPlanId })
      .where(eq(workspaces.id, first.value.id));

    const second = await createWorkspace(deps, owner.userId, {
      name: 'Workspace B (mais novo)',
    });
    if (!second.ok) throw new Error('setup falhou');

    // Convida + aceita um membro no segundo workspace (o mais novo).
    const member = await registerVerified(deps);
    const memberEmail = (await deps.repos.user.findById(member.userId))?.email;
    if (!memberEmail) throw new Error('setup falhou');
    const invite = await createInvite(
      deps,
      { userId: owner.userId, workspaceId: second.value.id, role: 'owner' },
      { emailOrPhone: memberEmail, role: 'member' }
    );
    if (!invite.ok) throw new Error('setup falhou');
    const accepted = await acceptInvite(deps, member.userId, invite.value.id);
    if (!accepted.ok) throw new Error('setup falhou');

    // Downgrade do primeiro workspace de volta pro free — quota cai de 5 pra
    // 1, e o dono já possui 2 (o segundo, mais novo, fica acima da quota).
    await db
      .update(workspaces)
      .set({ planId: (await deps.repos.plan.findByKey('free'))?.id })
      .where(eq(workspaces.id, first.value.id));

    // Dono nunca é rebaixado — continua com acesso total no workspace
    // acima da quota, mesmo pedindo papel mínimo alto.
    const ownerAsOwner = await requireWorkspaceRole(
      deps,
      bearerRequest(owner.accessToken),
      second.value.id,
      'owner'
    );
    expect(ownerAsOwner.ok).toBe(true);
    if (ownerAsOwner.ok) expect(ownerAsOwner.value.role).toBe('owner');

    // Membro consegue ler (minRole viewer)...
    const memberAsViewer = await requireWorkspaceRole(
      deps,
      bearerRequest(member.accessToken),
      second.value.id,
      'viewer'
    );
    expect(memberAsViewer.ok).toBe(true);
    if (memberAsViewer.ok) expect(memberAsViewer.value.role).toBe('viewer');

    // ...mas não consegue escrever (minRole member) — rebaixado pra viewer.
    const memberAsMember = await requireWorkspaceRole(
      deps,
      bearerRequest(member.accessToken),
      second.value.id,
      'member'
    );
    expect(memberAsMember.ok).toBe(false);
    if (!memberAsMember.ok) expect(memberAsMember.error.status).toBe(403);
  });

  test('membro acima do limite do plano (workspace dentro da quota) vira só leitura', async () => {
    const deps = createTestDeps(db);
    const owner = await registerVerified(deps);

    const workspace = await createWorkspace(deps, owner.userId, {
      name: 'Workspace com limite de membro baixo',
    });
    if (!workspace.ok) throw new Error('setup falhou');

    // Plano de teste próprio (não depende do valor exato do seed do free/
    // premium) — libera 1 workspace/2 membros pra caber o convite, depois
    // é derrubado pra um limite de 1 membro (só o dono).
    const roomyPlan = await createPlan(deps, owner.userId, {
      key: uniquePlanKey(),
      name: 'Plano de teste (folgado)',
      trialDays: 0,
      limits: {
        maxOwnedSharedWorkspaces: 1,
        maxMembersPerWorkspace: 2,
        maxSavedFormulasPerWorkspace: 10,
      },
      features: [],
    });
    if (!roomyPlan.ok) throw new Error('setup falhou');
    await db
      .update(workspaces)
      .set({ planId: roomyPlan.value.id })
      .where(eq(workspaces.id, workspace.value.id));

    const member = await registerVerified(deps);
    const memberEmail = (await deps.repos.user.findById(member.userId))?.email;
    if (!memberEmail) throw new Error('setup falhou');
    const invite = await createInvite(
      deps,
      {
        userId: owner.userId,
        workspaceId: workspace.value.id,
        role: 'owner',
      },
      { emailOrPhone: memberEmail, role: 'member' }
    );
    if (!invite.ok) throw new Error('setup falhou');
    const accepted = await acceptInvite(deps, member.userId, invite.value.id);
    if (!accepted.ok) throw new Error('setup falhou');

    // Downgrade pra um plano que só permite 1 membro (o dono) — o membro,
    // que entrou depois, vira excedente.
    const strictPlan = await createPlan(deps, owner.userId, {
      key: uniquePlanKey(),
      name: 'Plano de teste (1 membro)',
      trialDays: 0,
      limits: {
        maxOwnedSharedWorkspaces: 1,
        maxMembersPerWorkspace: 1,
        maxSavedFormulasPerWorkspace: 10,
      },
      features: [],
    });
    if (!strictPlan.ok) throw new Error('setup falhou');
    await db
      .update(workspaces)
      .set({ planId: strictPlan.value.id })
      .where(eq(workspaces.id, workspace.value.id));

    const memberAsViewer = await requireWorkspaceRole(
      deps,
      bearerRequest(member.accessToken),
      workspace.value.id,
      'viewer'
    );
    expect(memberAsViewer.ok).toBe(true);
    if (memberAsViewer.ok) expect(memberAsViewer.value.role).toBe('viewer');

    const memberAsMember = await requireWorkspaceRole(
      deps,
      bearerRequest(member.accessToken),
      workspace.value.id,
      'member'
    );
    expect(memberAsMember.ok).toBe(false);

    // Dono nunca é afetado por essa checagem.
    const ownerAsOwner = await requireWorkspaceRole(
      deps,
      bearerRequest(owner.accessToken),
      workspace.value.id,
      'owner'
    );
    expect(ownerAsOwner.ok).toBe(true);
  });
});
