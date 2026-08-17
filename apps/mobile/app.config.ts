import type { ConfigContext, ExpoConfig } from 'expo/config';

import pkg from './package.json';

// `app.json` continua com a config estática (nome, ícones, plugins etc.) —
// este arquivo só sobrescreve `version`, pra ter uma única fonte de verdade
// (o `version` do package.json) tanto pro binário nativo quanto pra exibição
// dentro do app (via expo-constants, ver profile.tsx).
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;

  // `ANDROID_VERSION_CODE` só existe no runner do release-mobile.yml,
  // derivado da tag (mobile-vX.Y.Z → X*10000+Y*100+Z) — precisa crescer a
  // cada release pro Android tratar uma reinstalação como upgrade em vez de
  // downgrade/erro. Sem a env (dev local, `expo start`), cai no que já
  // estiver em app.json (hoje nada, então o Expo assume 1).
  const androidVersionCode = process.env.ANDROID_VERSION_CODE
    ? Number(process.env.ANDROID_VERSION_CODE)
    : base.android?.versionCode;

  return {
    ...base,
    version: pkg.version,
    android: {
      ...base.android,
      ...(androidVersionCode ? { versionCode: androidVersionCode } : {}),
    },
  };
};
