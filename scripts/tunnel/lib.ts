import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Estado do túnel cloudflared gerenciado por estes scripts, persistido fora
 * do git (repo root, .gitignore) — sobrevive entre invocações separadas de
 * `bun run tunnel:open/status/close`.
 */
export interface TunnelState {
  pid: number;
  url: string;
  port: number;
  startedAt: string;
}

export const STATE_FILE = join(
  import.meta.dir,
  '..',
  '..',
  '.tunnel-state.json'
);
export const DEFAULT_PORT = 3000;

export function readState(): TunnelState | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as TunnelState;
  } catch {
    return null;
  }
}

export function writeState(state: TunnelState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function clearState(): void {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
}

/**
 * O PID que o bash ecoa (`$!`) ao rodar cloudflared via nohup no Windows não
 * bate com o PID real do processo no Windows (tradução MSYS/Win32) — checar
 * `process.kill(pid, 0)` com esse valor dá falso "morto" mesmo com o túnel
 * de pé. Checa por nome de imagem via `tasklist` em vez de PID — assume no
 * máximo um cloudflared rodando por vez (único uso real deste script: o
 * túnel de dev deste projeto).
 */
export async function isCloudflaredRunning(): Promise<boolean> {
  const proc = Bun.spawn(['tasklist', '/FI', 'IMAGENAME eq cloudflared.exe'], {
    stdout: 'pipe',
    stderr: 'ignore',
  });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  return text.toLowerCase().includes('cloudflared.exe');
}

/** Mata todo processo cloudflared.exe — ver nota de isCloudflaredRunning sobre por que não usa o pid registrado. */
export async function killCloudflared(): Promise<boolean> {
  const proc = Bun.spawn(['taskkill', '/IM', 'cloudflared.exe', '/F'], {
    stdout: 'ignore',
    stderr: 'ignore',
  });
  const exitCode = await proc.exited;
  return exitCode === 0;
}

/** Confere se a URL pública do túnel está de verdade roteando pro backend local. */
export async function isTunnelReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
