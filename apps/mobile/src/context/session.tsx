import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { authApi, type AuthSession } from '@/lib/auth-api';
import { tokenStore } from '@/lib/secure-store';

interface SessionContextValue {
  user: AuthSession['user'] | null;
  isLoading: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession['user'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tokenStore
      .getAccessToken()
      .then((token) => (token ? authApi.me() : null))
      .then((me) => setUser(me?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (session: AuthSession) => {
    await tokenStore.setTokens(session.accessToken, session.refreshToken);
    setUser(session.user);
  };

  const signOut = async () => {
    const refreshToken = await tokenStore.getRefreshToken();
    await tokenStore.clearTokens();
    setUser(null);
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
  };

  return (
    <SessionContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession precisa estar dentro de <SessionProvider>');
  return context;
}
