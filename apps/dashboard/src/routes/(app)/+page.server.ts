import * as summaryApi from '$lib/server/summary-api';

import type { PageServerLoad } from './$types';

function currentYearMonth(): { year: number; month: number } {
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { activeWorkspace } = await parent();

	const fallback = currentYearMonth();
	const year = Number(url.searchParams.get('year')) || fallback.year;
	const month = Number(url.searchParams.get('month')) || fallback.month;

	if (!activeWorkspace || !locals.session) {
		return { summary: null, year, month };
	}

	const result = await summaryApi.getMonthlySummary(
		locals.session.accessToken,
		activeWorkspace.id,
		year,
		month
	);

	return {
		summary: result.ok ? result.value : null,
		year,
		month
	};
};
