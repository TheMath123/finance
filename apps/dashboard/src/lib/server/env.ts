import { env as rawEnv } from '$env/dynamic/private';
import { z } from 'zod';

/**
 * Envs do dashboard, todas privadas (server-only) — validadas no boot, mesma
 * convenção do backend/app. `$env/dynamic/private` nunca é incluído no bundle
 * do client, e este arquivo vive em lib/server/, que o SvelteKit proíbe de
 * importar em código client.
 */
const envSchema = z.object({
	API_URL: z.url()
});

export const env = envSchema.parse({
	API_URL: rawEnv.API_URL
});
