import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { type AuthSession, authApi } from '@/lib/auth-api';
import { signOutGoogleLocally } from '@/lib/hooks/use-google-auth';
import {
  registerForPushNotifications,
  unregisterCurrentPushToken,
} from '@/lib/push-notifications';
import { tokenStore, workspaceStore } from '@/lib/secure-store';

interface SessionContextValue {
  user: AuthSession['user'] | null;
  workspaceId: string | null;
  /** key → enabled — gateia UI de features experimentais (ex. import de CSV de fatura). */
  featureFlags: Record<string, boolean>;
  isLoading: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Rebusca `/auth/me` e atualiza o usuário em memória (ex.: após verificar
   * e-mail). Não mexe no workspace ativo. Retorna o usuário fresco pra quem
   * precisa reagir ao valor novo no mesmo tique (ex.: poll do vínculo WhatsApp).
   */
  refreshUser: () => Promise<AuthSession['user']>;
  /** Troca o workspace ativo (seletor) e persiste a escolha entre reaberturas do app. */
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession['user'] | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await tokenStore.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        setUser(me.user);
        setFeatureFlags(me.featureFlags);
        const stored = await workspaceStore.getActiveWorkspaceId();
        setWorkspaceId(stored ?? me.defaultWorkspaceId);
        void registerForPushNotifications();
      } catch {
        setUser(null);
        setWorkspaceId(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = async (session: AuthSession) => {
    await tokenStore.setTokens(session.accessToken, session.refreshToken);
    await workspaceStore.setActiveWorkspaceId(session.defaultWorkspaceId);
    setUser(session.user);
    setWorkspaceId(session.defaultWorkspaceId);
    void registerForPushNotifications();
    // AuthSession (login/register) não traz featureFlags — só /auth/me.
    // Busca em segundo plano pra não atrasar a navegação pós-login.
    void authApi
      .me()
      .then((me) => setFeatureFlags(me.featureFlags))
      .catch(() => {});
  };

  const signOut = async () => {
    const refreshToken = await tokenStore.getRefreshToken();
    await tokenStore.clearTokens();
    await workspaceStore.clearActiveWorkspaceId();
    setUser(null);
    setWorkspaceId(null);
    setFeatureFlags({});
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    void unregisterCurrentPushToken();
    void signOutGoogleLocally();
  };

  const refreshUser = async () => {
    const me = await authApi.me();
    setUser(me.user);
    setFeatureFlags(me.featureFlags);
    return me.user;
  };

  const switchWorkspace = async (id: string) => {
    await workspaceStore.setActiveWorkspaceId(id);
    setWorkspaceId(id);
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        workspaceId,
        featureFlags,
        isLoading,
        signIn,
        signOut,
        refreshUser,
        switchWorkspace,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context)
    throw new Error('useSession precisa estar dentro de <SessionProvider>');
  return context;
}
