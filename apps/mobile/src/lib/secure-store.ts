import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const ACTIVE_WORKSPACE_KEY = 'auth.activeWorkspaceId';

export const tokenStore = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setTokens: async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

/** Workspace ativo escolhido no seletor (M2) — sobrevive a reabertura do app; limpo no logout. */
export const workspaceStore = {
  getActiveWorkspaceId: () => SecureStore.getItemAsync(ACTIVE_WORKSPACE_KEY),
  setActiveWorkspaceId: (workspaceId: string) => SecureStore.setItemAsync(ACTIVE_WORKSPACE_KEY, workspaceId),
  clearActiveWorkspaceId: () => SecureStore.deleteItemAsync(ACTIVE_WORKSPACE_KEY),
};

const BIOMETRIC_ENABLED_KEY = 'auth.biometricEnabled';

/** Preferência de trava por biometria (M2-12) — não é segredo, mas reaproveita o mesmo storage por simplicidade. */
export const biometricStore = {
  getEnabled: async () => (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === '1',
  setEnabled: (enabled: boolean) => SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? '1' : '0'),
};
