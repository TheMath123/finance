import type { ConfigContext, ExpoConfig } from 'expo/config';

import pkg from './package.json';

// `app.json` continua com a config estática (nome, ícones, plugins etc.) —
// este arquivo só sobrescreve `version`, pra ter uma única fonte de verdade
// (o `version` do package.json) tanto pro binário nativo quanto pra exibição
// dentro do app (via expo-constants, ver profile.tsx).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  version: pkg.version,
});
