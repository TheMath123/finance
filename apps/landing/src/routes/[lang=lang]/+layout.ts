import type { Lang } from '../../params/lang';

export function load({ params }) {
	return { lang: params.lang as Lang };
}
