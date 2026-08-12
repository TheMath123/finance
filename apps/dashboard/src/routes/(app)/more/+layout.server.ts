import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => ({
	categoriesManagementEnabled: locals.session?.featureFlags.custom_category_creation === true
});
