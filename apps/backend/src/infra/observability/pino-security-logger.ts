import type { SecurityLogger } from "../../application/ports/logger";
import type { Logger } from "./logger";

export function createSecurityLogger(logger: Logger): SecurityLogger {
  return {
    log(event, data = {}) {
      logger.warn({ scope: "security", event, ...data });
    },
  };
}
