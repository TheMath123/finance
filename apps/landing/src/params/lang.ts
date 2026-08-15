import type { ParamMatcher } from '@sveltejs/kit';

export const SUPPORTED_LANGS = ['pt', 'en', 'es'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const match: ParamMatcher = (param): param is Lang =>
	(SUPPORTED_LANGS as readonly string[]).includes(param);
