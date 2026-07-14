import { createDb } from "@finance/db";
import { mailer } from "@finance/email";
import { createDirectDispatcher } from "@finance/queues";
import { createApp } from "./app";
import { loadEnv } from "./env";

const env = loadEnv();
const db = createDb();

/** M1: dispatcher direto (fire-and-forget). No M2 vira BullMQ atrás da mesma interface. */
const dispatcher = createDirectDispatcher({
  "email.password-reset": (p) => mailer.sendPasswordReset(p),
  "email.verify-email": (p) => mailer.sendEmailVerification(p),
  "email.password-changed": (p) => mailer.sendPasswordChanged(p),
  "email.workspace-invite": (p) => mailer.sendWorkspaceInvite(p),
});

const app = createApp({
  db,
  dispatch: dispatcher.dispatch,
  jwtSecret: env.JWT_SECRET,
  appUrl: env.APP_URL,
  termsVersion: env.TERMS_VERSION,
}).listen(env.PORT);

console.log(`🦊 backend rodando em http://localhost:${app.server?.port}`);
