import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
import type { AppDeps } from '../http/deps';
import { errorHandler } from '../http/error-handler';
import { accountRoutes } from '../http/modules/account/routes';
import { adminRoutes } from '../http/modules/admin/routes';
import { authRoutes } from '../http/modules/auth/routes';
import { bankRoutes } from '../http/modules/bank/routes';
import { cardRoutes } from '../http/modules/card/routes';
import { categoryRoutes } from '../http/modules/category/routes';
import { notificationRoutes } from '../http/modules/notification/routes';
import { recurringRoutes } from '../http/modules/recurring/routes';
import { savedFormulaRoutes } from '../http/modules/saved-formula/routes';
import { splitRoutes } from '../http/modules/split/routes';
import { summaryRoutes } from '../http/modules/summary/routes';
import { transactionRoutes } from '../http/modules/transaction/routes';
import { transferRoutes } from '../http/modules/transfer/routes';
import { whatsappRoutes } from '../http/modules/whatsapp/routes';
import { workspaceRoutes } from '../http/modules/workspace/routes';
import { requestId } from '../http/request-id';

export function createApp(deps: AppDeps) {
  return (
    new Elysia()
      // Restrito à origem do dashboard (M4). O fluxo normal do dashboard é
      // server-to-server (sem CORS); isto é defesa em profundidade.
      .use(cors({ origin: deps.dashboardOrigin }))
      .use(requestId)
      .use(errorHandler(deps.httpLogger))
      .get('/health', () => ({ status: 'ok' }))
      .use(authRoutes(deps))
      .use(workspaceRoutes(deps))
      .use(bankRoutes(deps))
      .use(accountRoutes(deps))
      .use(cardRoutes(deps))
      .use(categoryRoutes(deps))
      .use(transactionRoutes(deps))
      .use(recurringRoutes(deps))
      .use(summaryRoutes(deps))
      .use(notificationRoutes(deps))
      .use(whatsappRoutes(deps))
      .use(transferRoutes(deps))
      .use(splitRoutes(deps))
      .use(savedFormulaRoutes(deps))
      .use(adminRoutes(deps))
  );
}
