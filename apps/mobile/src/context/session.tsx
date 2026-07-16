import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { authApi, type AuthSession } from '@/lib/auth-api';
import { tokenStore } from '@/lib/secure-store';

interface SessionContextValue {
  user: AuthSession['user'] | null;
  workspaceId: string | null;
  isLoading: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  /** Rebusca `/auth/me` e atualiza o usuário em memória (ex.: após verificar e-mail). */
  refreshUser: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession['user'] | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tokenStore
      .getAccessToken()
      .then((token) => (token ? authApi.me() : null))
      .then((me) => {
        setUser(me?.user ?? null);
        setWorkspaceId(me?.defaultWorkspaceId ?? null);
      })
      .catch(() => {
        setUser(null);
        setWorkspaceId(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (session: AuthSession) => {
    await tokenStore.setTokens(session.accessToken, session.refreshToken);
    setUser(session.user);
    setWorkspaceId(session.defaultWorkspaceId);
  };

  const signOut = async () => {
    const refreshToken = await tokenStore.getRefreshToken();
    await tokenStore.clearTokens();
    setUser(null);
    setWorkspaceId(null);
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
  };

  const refreshUser = async () => {
    const me = await authApi.me();
    setUser(me.user);
    setWorkspaceId(me.defaultWorkspaceId);
  };

  return (
    <SessionContext.Provider value={{ user, workspaceId, isLoading, signIn, signOut, refreshUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession precisa estar dentro de <SessionProvider>');
  return context;
}
