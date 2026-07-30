import type { Plan } from '../../application/ports/plan-repository';

/** Trava de feature por plano (M5-02) — distinto do `feature_flags` do M4-09, que é kill-switch global. */
export function hasFeature(plan: Plan, key: string): boolean {
  return plan.features.includes(key);
}
