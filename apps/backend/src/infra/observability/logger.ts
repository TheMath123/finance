import { mkdirSync } from "node:fs";
import { join } from "node:path";
import pino from "pino";

/**
 * Logger único do backend. Sempre grava em dois lugares: stdout (colorido em
 * dev via pino-pretty, JSON puro em produção) e um arquivo JSON completo em
 * `apps/backend/logs/<name>.log` — poder reconstruir depois o que aconteceu
 * (terminal já rolou, background task morreu) foi exatamente o que faltou
 * depurando o webhook do WhatsApp (M2-06). `name` separa o arquivo por
 * processo (`api` vs `worker`), já que os dois rodam em paralelo.
 */
export function createLogger(level: string, name = "api") {
  const pretty = process.env.NODE_ENV !== "production";
  const logsDir = join(import.meta.dir, "..", "..", "..", "logs");
  mkdirSync(logsDir, { recursive: true });
  const logFile = join(logsDir, `${name}.log`);

  const targets: pino.TransportTargetOptions[] = [
    {
      target: pretty ? "pino-pretty" : "pino/file",
      level,
      options: pretty
        ? { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname", destination: 1 }
        : { destination: 1 },
    },
    { target: "pino/file", level: "debug", options: { destination: logFile, mkdir: true } },
  ];

  return pino({ level, timestamp: pino.stdTimeFunctions.isoTime }, pino.transport({ targets }));
}

export type Logger = ReturnType<typeof createLogger>;
