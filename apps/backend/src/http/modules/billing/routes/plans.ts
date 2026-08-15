import { Elysia } from 'elysia';
import { listAvailablePlans } from '../../../../application/use-cases/billing/list-available-plans';
import type { AppDeps } from '../../../deps';

/**
 * M5-05 — planos disponíveis pra autoatendimento (M5-04). Pública de
 * verdade (sem autenticação): o use-case não recebe nem usa `actor`, só
 * lista planos ativos e não-privados direto do repositório — o gate de
 * autenticação que existia aqui não personalizava nada por usuário, só
 * bloqueava visitantes anônimos (ex.: página de Planos do site
 * institucional, que precisa mostrar preço real sem exigir login).
 */
export const listAvailablePlansRoute = (deps: AppDeps) =>
  new Elysia().get('/plans', () => listAvailablePlans(deps));
