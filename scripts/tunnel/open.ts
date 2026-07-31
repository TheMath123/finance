import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_PORT,
  isCloudflaredRunning,
  isTunnelReachable,
  killCloudflared,
  readState,
  writeState,
} from './lib';

const URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const STARTUP_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 300;
const LOG_FILE = join(import.meta.dir, '..', '..', '.tunnel.log');

async function main() {
  const port = Number(process.argv[2] ?? DEFAULT_PORT);

  const existing = readState();
  if (existing && (await isCloudflaredRunning())) {
    console.log(`Já tem um túnel de pé: ${existing.url}`);
    console.log('Rode "bun run tunnel:close" antes de abrir outro.');
    return;
  }

  console.log(`Abrindo túnel cloudflared pra http://localhost:${port} ...`);

  // Apaga o log da rodada anterior antes de tudo — sem isso, o primeiro
  // poll() pode ler conteúdo antigo (URL de um túnel já fechado) antes do
  // processo novo sequer começar a escrever, e a gente registra a URL errada.
  if (existsSync(LOG_FILE)) unlinkSync(LOG_FILE);

  // No Windows, Bun.spawn direto amarra o cloudflared ao job object deste
  // script — ele morre junto quando o script termina, mesmo com unref().
  // `nohup ... & echo $!` via bash desacopla de verdade (mesmo mecanismo
  // que sobreviveu em teste manual nesta mesma máquina): a saída vai pro
  // arquivo de log, e o PID ecoado é o do processo cloudflared real.
  const shellCmd = `nohup cloudflared tunnel --url http://localhost:${port} > "${LOG_FILE.replace(/\\/g, '/')}" 2>&1 & echo $!`;
  const shellProc = Bun.spawn(['bash', '-c', shellCmd], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const pidText = (await new Response(shellProc.stdout).text()).trim();
  await shellProc.exited;
  const pid = Number(pidText);

  if (!pid) {
    console.error(
      `Não consegui capturar o PID do cloudflared (saída: "${pidText}").`
    );
    process.exit(1);
  }

  const url = await pollForUrl();

  if (!url) {
    await killCloudflared();
    console.error(
      `Não recebi a URL do túnel em ${STARTUP_TIMEOUT_MS / 1000}s — abortei o processo. Log: ${LOG_FILE}`
    );
    process.exit(1);
  }

  writeState({ pid, url, port, startedAt: new Date().toISOString() });

  console.log(`Túnel no ar: ${url}`);
  console.log(`Webhook do Stripe: ${url}/webhooks/stripe`);

  // Cloudflare avisa que a URL pode demorar um pouco pra ficar alcançável
  // de fato (propagação de DNS/edge) — algumas tentativas com espera curta
  // em vez de checar só uma vez e assustar com falso negativo.
  let reachable = false;
  for (let attempt = 0; attempt < 6 && !reachable; attempt++) {
    if (attempt > 0) await Bun.sleep(2000);
    reachable = await isTunnelReachable(url);
  }
  console.log(
    reachable
      ? '/health respondeu 200 — túnel roteando certo pro backend local.'
      : `Aviso: /health ainda não respondeu depois de alguns segundos — confirme se o backend está rodando em localhost:${port}, ou rode "bun run tunnel:status" daqui a pouco.`
  );
}

async function pollForUrl(): Promise<string | null> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const text = await Bun.file(LOG_FILE)
      .text()
      .catch(() => '');
    const match = text.match(URL_PATTERN);
    if (match) return match[0];
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  return null;
}

main();
