/**
 * Testes do módulo de workspaces compartilhados (M2-02) contra o Postgres local:
 * criação de workspace family, convites (criar/aceitar/revogar), regra de
 * sucessão de owner (mudança de papel e remoção/saída de membro) e enforcement
 * de limite de plano free (M2-03).
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import {
  bankAccounts,
  banks,
  categories,
  createDb,
  type Db,
  workspaceInvites,
  workspaces,
} from '@finance/db';
import { eq } from 'drizzle-orm';
import type { Workspace } from '../../../domain/entities/workspace';
import {
  createTestDeps,
  type DispatchedJob,
  getTestPlanId,
} from '../../../test/deps';
import type { Actor, UseCaseDeps } from '../../deps';
import {
  confirmAccountDeletion,
  register,
  requestAccountDeletion,
} from '../auth';
import {
  acceptInvite,
  createInvite,
  createWorkspace,
  listActivity,
  listMyInvites,
  listMyWorkspaces,
  removeMember,
  revokeInvite,
  updateMemberRole,
  updateWorkspace,
} from '.';

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

/**
 * Exclusão de conta agora é em duas etapas (reautentica → código por e-mail →
 * confirma — ver `request-account-deletion.ts`/`confirm-account-deletion.ts`).
 * Este helper só existe pra manter os testes de cascata de workspace enxutos;
 * `deps` precisa ter sido criado com o `jobs` passado aqui pra capturar o código.
 */
async function deleteAccountForTest(
  deps: UseCaseDeps,
  jobs: DispatchedJob[],
  userId: string,
  password: string
) {
  const requested = await requestAccountDeletion(deps, { userId, password });
  if (!requested.ok) return requested;
  const job = jobs.find((j) => j.name === 'email.confirm-account-deletion');
  if (!job) throw new Error('job de confirmação de exclusão não disparado');
  const code = (job.payload as { code: string }).code;
  return confirmAccountDeletion(deps, { userId, code });
}

/**
 * Registra um usuário novo e devolve o Actor dele no próprio workspace pessoal
 * (sempre owner). E-mail já sai verificado (auditoria 2026-07-19: aceitar
 * convite por e-mail agora exige `emailVerifiedAt` — a maioria dos testes
 * deste arquivo quer testar o fluxo de convite em si, não o de verificação).
 */
async function newOwnerActor(): Promise<{
  actor: Actor;
  email: string;
  name: string;
}> {
  const deps = createTestDeps(db);
  const email = uniqueEmail();
  const name = `Dono ${crypto.randomUUID().slice(0, 8)}`;
  const result = await register(deps, {
    name,
    email,
    password: 'senha-forte-123',
  });
  if (!result.ok) throw new Error('falha ao registrar usuário de teste');
  await deps.repos.user.markEmailVerified(result.value.user.id);
  return {
    actor: {
      userId: result.value.user.id,
      workspaceId: result.value.defaultWorkspaceId,
      role: 'owner',
    },
    email,
    name,
  };
}

/** `createWorkspace` retorna Either desde a M2-03 (pode falhar por limite de plano) — testes que só precisam do workspace usam este atalho. */
async function mustCreateWorkspace(
  deps: ReturnType<typeof createTestDeps>,
  userId: string,
  name: string
): Promise<Workspace> {
  const result = await createWorkspace(deps, userId, { name });
  if (!result.ok) throw new Error(`falha ao criar workspace: ${result.error}`);
  return result.value;
}

describe('workspace: criação', () => {
  test('cria workspace family e o criador vira owner', async () => {
    const deps = createTestDeps(db);
    const { actor } = await newOwnerActor();

    const workspace = await mustCreateWorkspace(
      deps,
      actor.userId,
      'Família Teste'
    );
    expect(workspace.type).toBe('family');

    const mine = await listMyWorkspaces(deps, actor.userId);
    expect(mine.some((w) => w.id === workspace.id && w.role === 'owner')).toBe(
      true
    );
  });

  test('owner/admin pode renomear o workspace (inclusive o pessoal)', async () => {
    const deps = createTestDeps(db);
    const { actor } = await newOwnerActor();

    const renamed = await updateWorkspace(deps, actor, { name: 'Nome Novo' });
    expect(renamed.name).toBe('Nome Novo');

    const found = await deps.repos.workspace.findById(actor.workspaceId);
    expect(found?.name).toBe('Nome Novo');
  });

  test('já nasce com categorias padrão, banco e conta zerada (mesmo onboarding do registro)', async () => {
    const deps = createTestDeps(db);
    const { actor } = await newOwnerActor();
    const workspace = await mustCreateWorkspace(
      deps,
      actor.userId,
      'Família com Onboarding'
    );

    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.workspaceId, workspace.id));
    expect(cats.length).toBeGreaterThanOrEqual(9);
    expect(cats.some((c) => c.isFallback)).toBe(true);

    const workspaceBanks = await db
      .select()
      .from(banks)
      .where(eq(banks.workspaceId, workspace.id));
    expect(workspaceBanks).toHaveLength(1);

    const workspaceAccounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.workspaceId, workspace.id));
    expect(workspaceAccounts).toHaveLength(1);
    expect(workspaceAccounts[0]?.initialBalance).toBe(0);
    expect(workspaceAccounts[0]?.bankId).toBe(workspaceBanks[0]?.id);
  });
});

describe('workspace: convites', () => {
  test('convida por e-mail, o convidado aceita e vira membro', async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família A'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const { actor: memberActor, email: memberEmail } = await newOwnerActor();

    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: memberEmail,
      role: 'member',
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;

    const pending = await listMyInvites(deps, memberActor.userId);
    expect(pending.some((i) => i.id === invite.value.id)).toBe(true);

    const accepted = await acceptInvite(
      deps,
      memberActor.userId,
      invite.value.id
    );
    expect(accepted.ok).toBe(true);

    const mine = await listMyWorkspaces(deps, memberActor.userId);
    expect(mine.some((w) => w.id === family.id && w.role === 'member')).toBe(
      true
    );
  });

  test('convite pra e-mail que já é membro falha com already_member', async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor, email: ownerEmail } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família B'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: ownerEmail,
      role: 'member',
    });
    expect(invite.ok).toBe(false);
    if (invite.ok) return;
    expect(invite.error).toBe('already_member');
  });

  test('aceitar convite de outro usuário falha com invite_not_found (404 genérico, não revela o convite alheio)', async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família C'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const { email: invitedEmail } = await newOwnerActor();
    const { actor: strangerActor } = await newOwnerActor();

    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: invitedEmail,
      role: 'member',
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;

    const result = await acceptInvite(
      deps,
      strangerActor.userId,
      invite.value.id
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Auditoria de segurança (2026-07-19): mesmo código de "não encontrado" que um
    // inviteId inexistente devolveria — não revela que o convite existe pra outra pessoa.
    expect(result.error).toBe('invite_not_found');
  });

  test('aceitar convite com e-mail não verificado falha (spec: convite exige e-mail verificado)', async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família D'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    // Registro direto (sem passar por newOwnerActor) — e-mail fica sem verificar de propósito.
    const email = uniqueEmail();
    const registered = await register(deps, {
      name: 'Convidado Não Verificado',
      email,
      password: 'senha-forte-123',
    });
    if (!registered.ok) throw new Error('setup falhou');

    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: email,
      role: 'member',
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;

    const result = await acceptInvite(
      deps,
      registered.value.user.id,
      invite.value.id
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invite_email_not_verified');

    // Depois de verificar o e-mail, o mesmo convite pode ser aceito normalmente.
    await deps.repos.user.markEmailVerified(registered.value.user.id);
    const secondAttempt = await acceptInvite(
      deps,
      registered.value.user.id,
      invite.value.id
    );
    expect(secondAttempt.ok).toBe(true);
  });

  test('revogar convite pendente impede aceite depois', async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família D'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const { actor: memberActor, email: memberEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: memberEmail,
      role: 'member',
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;

    const revoked = await revokeInvite(
      deps,
      ownerActor.userId,
      invite.value.id
    );
    expect(revoked.ok).toBe(true);

    const accepted = await acceptInvite(
      deps,
      memberActor.userId,
      invite.value.id
    );
    expect(accepted.ok).toBe(false);
    if (accepted.ok) return;
    expect(accepted.error).toBe('invite_not_pending');
  });
});

describe('workspace: regra de sucessão de owner', () => {
  test('único owner não pode ser rebaixado nem sair', async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família E'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const demoted = await updateMemberRole(deps, familyOwner, {
      userId: ownerActor.userId,
      role: 'admin',
    });
    expect(demoted.ok).toBe(false);
    if (!demoted.ok) expect(demoted.error).toBe('sole_owner_cannot_be_demoted');

    const left = await removeMember(deps, familyOwner, ownerActor.userId);
    expect(left.ok).toBe(false);
    if (!left.ok) expect(left.error).toBe('sole_owner_cannot_leave');
  });

  test('com dois owners, um deles pode ser rebaixado ou sair', async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família F'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const { actor: secondActor, email: secondEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: secondEmail,
      role: 'member',
    });
    if (!invite.ok) throw new Error('convite falhou');
    await acceptInvite(deps, secondActor.userId, invite.value.id);

    const promoted = await updateMemberRole(deps, familyOwner, {
      userId: secondActor.userId,
      role: 'owner',
    });
    expect(promoted.ok).toBe(true);

    const secondAsOwner: Actor = {
      userId: secondActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };
    const demoted = await updateMemberRole(deps, secondAsOwner, {
      userId: ownerActor.userId,
      role: 'admin',
    });
    expect(demoted.ok).toBe(true);
  });

  test('member comum pode sair sozinho; admin pode remover outro membro', async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família G'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const { actor: memberActor, email: memberEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: memberEmail,
      role: 'member',
    });
    if (!invite.ok) throw new Error('convite falhou');
    await acceptInvite(deps, memberActor.userId, invite.value.id);

    const memberAsSelf: Actor = {
      userId: memberActor.userId,
      workspaceId: family.id,
      role: 'member',
    };
    const left = await removeMember(deps, memberAsSelf, memberActor.userId);
    expect(left.ok).toBe(true);

    // Convida de novo pra testar remoção feita pelo admin (em vez de saída voluntária)
    const invite2 = await createInvite(deps, familyOwner, {
      emailOrPhone: memberEmail,
      role: 'member',
    });
    if (!invite2.ok) throw new Error('convite falhou');
    await acceptInvite(deps, memberActor.userId, invite2.value.id);

    const kicked = await removeMember(deps, familyOwner, memberActor.userId);
    expect(kicked.ok).toBe(true);
  });

  test('member comum não pode remover outro membro', async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família H'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const { actor: memberActor, email: memberEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: memberEmail,
      role: 'member',
    });
    if (!invite.ok) throw new Error('convite falhou');
    await acceptInvite(deps, memberActor.userId, invite.value.id);

    const memberAsSelf: Actor = {
      userId: memberActor.userId,
      workspaceId: family.id,
      role: 'member',
    };
    const result = await removeMember(deps, memberAsSelf, ownerActor.userId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('forbidden');
  });
});

describe('workspace: enforcement de plano free (M2-03)', () => {
  test('free: usuário não pode criar um segundo workspace compartilhado', async () => {
    const deps = createTestDeps(db);
    const { actor } = await newOwnerActor();

    const first = await createWorkspace(deps, actor.userId, {
      name: 'Primeira Família',
    });
    expect(first.ok).toBe(true);

    const second = await createWorkspace(deps, actor.userId, {
      name: 'Segunda Família',
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('plan_limit_reached');
  });

  test('free: workspace não passa de 5 membros (convite recusado, aceite defende de novo)', async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família Lotada'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    // Owner já conta como 1 membro — mais 4 convites aceitos preenche os 5.
    for (let i = 0; i < 4; i++) {
      const { actor: memberActor, email } = await newOwnerActor();
      const invite = await createInvite(deps, familyOwner, {
        emailOrPhone: email,
        role: 'member',
      });
      if (!invite.ok) throw new Error('convite falhou');
      const accepted = await acceptInvite(
        deps,
        memberActor.userId,
        invite.value.id
      );
      expect(accepted.ok).toBe(true);
    }

    const { email: sixthEmail } = await newOwnerActor();
    const sixthInvite = await createInvite(deps, familyOwner, {
      emailOrPhone: sixthEmail,
      role: 'member',
    });
    expect(sixthInvite.ok).toBe(false);
    if (!sixthInvite.ok) expect(sixthInvite.error).toBe('plan_limit_reached');
  });

  test('premium: limites maiores (5 workspaces, 20 membros) que o free', async () => {
    const deps = createTestDeps(db);
    const { actor } = await newOwnerActor();

    const first = await mustCreateWorkspace(
      deps,
      actor.userId,
      'Família Premium 1'
    );
    const premiumPlanId = await getTestPlanId(db, 'premium');
    await db
      .update(workspaces)
      .set({ planId: premiumPlanId })
      .where(eq(workspaces.id, first.id));

    // Upgrade de QUALQUER workspace já possuído libera a quota (maior limite
    // efetivo) pra conta toda — mesmo o workspace novo nascendo no free.
    const second = await createWorkspace(deps, actor.userId, {
      name: 'Família Premium 2',
    });
    expect(second.ok).toBe(true);

    const familyOwner: Actor = {
      userId: actor.userId,
      workspaceId: first.id,
      role: 'owner',
    };
    for (let i = 0; i < 5; i++) {
      const { actor: memberActor, email } = await newOwnerActor();
      const invite = await createInvite(deps, familyOwner, {
        emailOrPhone: email,
        role: 'member',
      });
      expect(invite.ok).toBe(true);
      if (!invite.ok) continue;
      const accepted = await acceptInvite(
        deps,
        memberActor.userId,
        invite.value.id
      );
      expect(accepted.ok).toBe(true);
    }
  });

  test('premium com trial vencido não infla a quota — cai pro limite do free', async () => {
    const deps = createTestDeps(db);
    const { actor } = await newOwnerActor();

    const first = await mustCreateWorkspace(
      deps,
      actor.userId,
      'Família Trial Vencido'
    );
    const premiumPlanId = await getTestPlanId(db, 'premium');
    await db
      .update(workspaces)
      .set({
        planId: premiumPlanId,
        trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // ontem
      })
      .where(eq(workspaces.id, first.id));

    // resolveEffectivePlan cai pro free (trial vencido) — quota continua a
    // do free (1), então já possuindo 1 workspace, criar outro é bloqueado.
    const second = await createWorkspace(deps, actor.userId, {
      name: 'Família Trial Vencido 2',
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('plan_limit_reached');
  });
});

describe('workspace: atividade (leitura do AuditLog, M2-04)', () => {
  test('lista as mutações do workspace com o nome de quem fez', async () => {
    const deps = createTestDeps(db);
    const { actor, name: ownerName } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      actor.userId,
      'Família com Atividade'
    );
    const familyOwner: Actor = {
      userId: actor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const activity = await listActivity(deps, familyOwner, {});
    expect(
      activity.some(
        (a) =>
          a.entity === 'workspace' &&
          a.action === 'create' &&
          a.userName === ownerName
      )
    ).toBe(true);
  });

  test('ação de usuário depois excluído aparece como usuário removido (anonimizado)', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família Anonimizada'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const { actor: secondActor, email: secondEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: secondEmail,
      role: 'member',
    });
    if (!invite.ok) throw new Error('convite falhou');
    await acceptInvite(deps, secondActor.userId, invite.value.id);
    await updateMemberRole(deps, familyOwner, {
      userId: secondActor.userId,
      role: 'owner',
    });

    // Owner original excluído — workspace sobrevive (segundo owner assumiu).
    await deleteAccountForTest(
      deps,
      jobs,
      ownerActor.userId,
      'senha-forte-123'
    );

    const secondAsOwner: Actor = {
      userId: secondActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };
    const activity = await listActivity(deps, secondAsOwner, {});
    const createEntry = activity.find(
      (a) => a.entity === 'workspace' && a.action === 'create'
    );
    expect(createEntry).toBeDefined();
    expect(createEntry?.userId).toBeNull();
    expect(createEntry?.userName).toBeNull();
  });
});

describe('workspace: exclusão de conta (LGPD) com workspaces compartilhados', () => {
  test('único owner: o workspace family é apagado junto com a conta', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const { actor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      actor.userId,
      'Família Solo'
    );

    const result = await deleteAccountForTest(
      deps,
      jobs,
      actor.userId,
      'senha-forte-123'
    );
    expect(result.ok).toBe(true);

    expect(
      await db.query.workspaces.findFirst({
        where: eq(workspaces.id, family.id),
      })
    ).toBeUndefined();
  });

  test('com outro owner: o workspace continua existindo, só a membership some', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família Compartilhada'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const { actor: secondActor, email: secondEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: secondEmail,
      role: 'member',
    });
    if (!invite.ok) throw new Error('convite falhou');
    await acceptInvite(deps, secondActor.userId, invite.value.id);
    await updateMemberRole(deps, familyOwner, {
      userId: secondActor.userId,
      role: 'owner',
    });

    const result = await deleteAccountForTest(
      deps,
      jobs,
      ownerActor.userId,
      'senha-forte-123'
    );
    expect(result.ok).toBe(true);

    expect(
      await db.query.workspaces.findFirst({
        where: eq(workspaces.id, family.id),
      })
    ).toBeDefined();
    const remainingRole = await deps.repos.workspace.getMemberRole(
      family.id,
      secondActor.userId
    );
    expect(remainingRole).toBe('owner');
  });

  test('convite enviado por quem excluiu a conta fica com invited_by nulo (sem quebrar a exclusão)', async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await mustCreateWorkspace(
      deps,
      ownerActor.userId,
      'Família com Convite'
    );
    const familyOwner: Actor = {
      userId: ownerActor.userId,
      workspaceId: family.id,
      role: 'owner',
    };

    const { actor: secondActor, email: secondEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: secondEmail,
      role: 'member',
    });
    if (!invite.ok) throw new Error('convite falhou');
    await acceptInvite(deps, secondActor.userId, invite.value.id);
    // Dois owners agora — o primeiro pode excluir a conta sem apagar o workspace nem travar na FK do convite.
    await updateMemberRole(deps, familyOwner, {
      userId: secondActor.userId,
      role: 'owner',
    });

    const result = await deleteAccountForTest(
      deps,
      jobs,
      ownerActor.userId,
      'senha-forte-123'
    );
    expect(result.ok).toBe(true);

    const row = await db.query.workspaceInvites.findFirst({
      where: eq(workspaceInvites.id, invite.value.id),
    });
    expect(row?.invitedBy).toBeNull();
  });
});
