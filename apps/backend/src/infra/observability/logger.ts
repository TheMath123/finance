import pino from "pino";

/**
 * Logger único do backend. Em produção (NODE_ENV=production) sai JSON puro em
 * stdout (pra qualquer coletor de log); fora disso usa pino-pretty (colorido,
 * legível no terminal do `bun run dev`).
 */
export function createLogger(level: string) {
  const pretty = process.env.NODE_ENV !== "production";

  return pino({
    level,
    transport: pretty
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        }
      : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
