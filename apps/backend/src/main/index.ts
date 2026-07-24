import { createApp } from './app';
import { createAppDeps } from './composition';
import { loadEnv } from './env';

const env = loadEnv();
const deps = createAppDeps(env);

const app = createApp(deps).listen(env.PORT);

deps.httpLogger.info(
  `🦊 backend rodando em http://localhost:${app.server?.port}`
);
