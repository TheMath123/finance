import { redirect } from '@sveltejs/kit';

/** /more é só o hub das abas — Contas é a entrada padrão (mesma ordem do app). */
export function load() {
	redirect(303, '/more/accounts');
}
