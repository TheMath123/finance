import { evaluateFormula } from '@finance/formula';
import { type Either, left, right } from '@finance/shared';
import type { SavedFormula } from '../../../domain/entities/saved-formula';
import type { Actor, UseCaseDeps } from '../../deps';
import type {
  SavedFormulaDraft,
  SavedFormulaPatch,
} from '../../ports/saved-formula-repository';
import type { SavedFormulaError } from './errors';
import { buildFormulaCatalog, currentYearMonth } from './formula-variables';

export async function createSavedFormula(
  deps: UseCaseDeps,
  actor: Actor,
  input: SavedFormulaDraft
): Promise<Either<SavedFormulaError, SavedFormula>> {
  // M5-02: antes só checava esse limite quando o workspace estava no plano
  // `free` (checagem `plan === 'free'`) — qualquer outro plano ficava sem
  // limite nenhum, nunca de propósito. Agora sempre consulta o limite real
  // do plano atual, seja ele qual for.
  const workspace = await deps.repos.workspace.findById(actor.workspaceId);
  if (workspace) {
    const plan = await deps.repos.plan.findById(workspace.planId);
    if (plan) {
      const count = await deps.repos.savedFormula.countByWorkspace(
        actor.workspaceId
      );
      if (count >= plan.limits.maxSavedFormulasPerWorkspace) {
        return left('plan_limit_reached');
      }
    }
  }

  const { year, month } = currentYearMonth();
  const { values } = await buildFormulaCatalog(deps, actor, year, month);
  const evaluated = evaluateFormula(input.expression, values);
  if (!evaluated.ok) return left(evaluated.error.type);

  const created = await deps.uow.run(async (repos) => {
    let formula = await repos.savedFormula.create(
      actor.workspaceId,
      actor.userId,
      input
    );

    // Nova fórmula fixada já entra ao fim da fila do widget correspondente
    // (drag-and-drop reordena depois, M5-01c).
    const orderPatch: SavedFormulaPatch = {};
    if (input.pinnedHome) {
      orderPatch.homeOrder =
        (await repos.savedFormula.maxOrder(actor.workspaceId, 'homeOrder')) + 1;
    }
    if (input.pinnedTransactions) {
      orderPatch.transactionsOrder =
        (await repos.savedFormula.maxOrder(
          actor.workspaceId,
          'transactionsOrder'
        )) + 1;
    }
    if (Object.keys(orderPatch).length > 0) {
      formula = await repos.savedFormula.update(formula.id, orderPatch);
    }

    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'create',
      entity: 'saved_formula',
      entityId: formula.id,
    });
    return formula;
  });
  return right(created);
}
