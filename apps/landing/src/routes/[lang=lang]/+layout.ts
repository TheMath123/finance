import type { Lang } from '../../params/lang';

export function load({ params, data }) {
	return { ...data, lang: params.lang as Lang };
}
