import type { SecurityLogger } from "../../application/ports/logger";

export const consoleSecurityLogger: SecurityLogger = {
  log(event, data = {}) {
    console.warn(
      JSON.stringify({ level: "warn", scope: "security", event, ...data, ts: new Date().toISOString() }),
    );
  },
};
