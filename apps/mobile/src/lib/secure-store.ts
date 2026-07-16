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
