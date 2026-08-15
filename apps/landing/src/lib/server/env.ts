import { building } from '$app/environment';
import { env as rawEnv } from '$env/dynamic/private';
import { z } from 'zod';

/**
 * Env do site, privada (server-only) — mesma convenção do dashboard
 * (ver apps/dashboard/src/lib/server/env.ts). `$env/dynamic/private` nunca
 * é incluído no bundle do client, e este arquivo vive em lib/server/, que
 * o SvelteKit proíbe de importar em código client.
 */
const envSchema = z.object({
	API_URL: z.url()
});

// `building` é true só durante `vite build` (etapa de análise de rotas, que
// importa todo módulo server pra ler exports tipo `prerender`, sem nenhuma
// env carregada) — nunca em runtime real. A página de Planos não é
// prerenderizada, então o placeholder abaixo nunca chega a ser usado de
// verdade.
export const env: z.infer<typeof envSchema> = building
	? ({ API_URL: 'http://localhost' } as z.infer<typeof envSchema>)
	: envSchema.parse({ API_URL: rawEnv.API_URL });
