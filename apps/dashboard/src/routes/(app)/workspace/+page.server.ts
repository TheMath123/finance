import { redirect } from '@sveltejs/kit';

/** /workspace é só o hub das abas — a primeira (Membros) é a entrada padrão. */
export function load() {
	redirect(303, '/workspace/members');
}
