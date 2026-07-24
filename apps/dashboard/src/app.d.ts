// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { ResolvedSession } from '$lib/server/session';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Sessão resolvida pelo hooks.server.ts — null quando não autenticado. */
			session: ResolvedSession | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
