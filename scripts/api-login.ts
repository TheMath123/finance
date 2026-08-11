/**
 * Loga contra a API (local ou remota, via API_URL) usando as credenciais de
 * `.env` (API_LOGIN_EMAIL/API_LOGIN_PASSWORD — sempre um usuário de teste,
 * nunca produção) e grava o accessToken resultante de volta em `.env`
 * (API_ACCESS_TOKEN) — pronto pra colar como variável de ambiente no Apidog
 * ou usar em curl/scripts manuais. Nunca imprime o token completo no
 * terminal (só os primeiros caracteres, pra confirmar que mudou sem expor o
 * valor em histórico de shell/CI).
 *
 * Uso: bun run auth:login
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ENV_PATH = join(import.meta.dir, '..', '.env');

function upsertEnvVar(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) return content.replace(pattern, line);
  const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  return `${content}${separator}${line}\n`;
}

async function main() {
  const apiUrl = Bun.env.API_URL ?? 'http://localhost:3000';
  const email = Bun.env.API_LOGIN_EMAIL;
  const password = Bun.env.API_LOGIN_PASSWORD;

  if (!email || !password) {
    console.error(
      'Faltam API_LOGIN_EMAIL / API_LOGIN_PASSWORD no .env da raiz (veja .env.example) — use um usuário de teste, nunca credenciais reais.'
    );
    process.exit(1);
  }

  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Login falhou (${res.status}): ${body}`);
    process.exit(1);
  }

  const data = (await res.json()) as { accessToken?: string };
  if (!data.accessToken) {
    console.error('Resposta de login sem accessToken — verifique a API.');
    process.exit(1);
  }

  const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';
  const updated = upsertEnvVar(existing, 'API_ACCESS_TOKEN', data.accessToken);
  writeFileSync(ENV_PATH, updated);

  console.log(
    `Login ok — API_ACCESS_TOKEN atualizado em .env (${data.accessToken.slice(0, 8)}...).`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
