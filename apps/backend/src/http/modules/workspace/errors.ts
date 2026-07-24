import type { WorkspaceError } from '../../../application/use-cases/workspace';
import type { HttpError } from '../../http-error';

export const WORKSPACE_ERRORS: Record<WorkspaceError, HttpError> = {
  member_not_found: {
    status: 404,
    code: 'member_not_found',
    message: 'Membro não encontrado.',
  },
  sole_owner_cannot_be_demoted: {
    status: 409,
    code: 'sole_owner_cannot_be_demoted',
    message:
      'O único owner não pode ser rebaixado — promova outro membro a owner antes.',
  },
  sole_owner_cannot_leave: {
    status: 409,
    code: 'sole_owner_cannot_leave',
    message:
      'O único owner não pode sair do workspace — promova outro membro a owner antes.',
  },
  owner_required_to_transfer: {
    status: 403,
    code: 'owner_required_to_transfer',
    message: 'Só um owner pode promover outro membro a owner.',
  },
  forbidden: {
    status: 403,
    code: 'forbidden',
    message: 'Você não tem permissão para esta ação.',
  },
  already_member: {
    status: 409,
    code: 'already_member',
    message: 'Esse usuário já é membro do workspace.',
  },
  invite_not_found: {
    status: 404,
    code: 'invite_not_found',
    message: 'Convite não encontrado.',
  },
  invite_not_pending: {
    status: 409,
    code: 'invite_not_pending',
    message: 'Este convite não está mais pendente.',
  },
  invite_forbidden: {
    status: 403,
    code: 'invite_forbidden',
    message: 'Este convite não é seu.',
  },
  plan_limit_reached: {
    status: 409,
    code: 'plan_limit_reached',
    message:
      'Limite do plano free atingido. Considere fazer upgrade pra premium.',
  },
};
