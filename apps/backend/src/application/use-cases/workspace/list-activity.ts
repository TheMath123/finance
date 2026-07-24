import type { Actor, UseCaseDeps } from '../../deps';
import type {
  AuditLogView,
  ListActivityFilters,
} from '../../ports/audit-recorder';

/** Atividade do workspace (spec: leitura do AuditLog — "quem excluiu isso?"). */
export function listActivity(
  deps: Pick<UseCaseDeps, 'repos'>,
  actor: Actor,
  filters: ListActivityFilters
): Promise<AuditLogView[]> {
  return deps.repos.audit.list(actor.workspaceId, filters);
}
