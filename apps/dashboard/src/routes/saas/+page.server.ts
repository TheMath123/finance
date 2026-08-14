import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

/** `/saas` não tem conteúdo próprio — o Dashboard (ex-Métricas) é a home do painel. */
export const load: PageServerLoad = async () => {
	redirect(307, '/saas/dashboard');
};
