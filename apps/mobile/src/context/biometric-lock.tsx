import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { biometricStore } from '@/lib/secure-store';

/**
 * Retorno do background depois de mais de 2min tranca de novo (decisão
 * tomada sem bloquear no pedido do usuário — comportamento tipo apps
 * bancários, mais adequado a um app de finanças pessoais do que só travar
 * no cold start; ver relatório da sessão). Cold start sempre tranca
 * (thresholds não se aplicam — o app acabou de abrir).
 */
const BACKGROUND_LOCK_THRESHOLD_MS = 2 * 60 * 1000;

interface BiometricLockContextValue {
  /** Dispositivo tem hardware de biometria (independente de estar cadastrada — a lib cai pro PIN do aparelho). */
  available: boolean;
  /** Preferência do usuário (liga/desliga nas configurações). */
  enabled: boolean;
  /** Se a tela de bloqueio deve ser exibida agora. */
  locked: boolean;
  ready: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  unlock: () => Promise<boolean>;
}

const BiometricLockContext = createContext<BiometricLockContextValue | null>(null);

export function BiometricLockProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const [hasHardware, isEnrolled, storedEnabled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        biometricStore.getEnabled(),
      ]);
      // hasHardwareAsync sozinho não basta: vários emuladores relatam sensor
      // presente mesmo sem nenhuma biometria cadastrada — isEnrolledAsync é o
      // que garante que authenticateAsync() tem algo pra checar depois. Sem
      // isso, o usuário conseguia ligar a trava e ficava sem forma de
      // desbloquear (a tela de lock não tem fallback de logout).
      const canUseBiometrics = hasHardware && isEnrolled;
      const effectiveEnabled = canUseBiometrics && storedEnabled;
      setAvailable(canUseBiometrics);
      setEnabledState(effectiveEnabled);
      setLocked(effectiveEnabled);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (!enabled) return;
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (nextState === 'active' && backgroundedAt.current) {
        if (Date.now() - backgroundedAt.current > BACKGROUND_LOCK_THRESHOLD_MS) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  const setEnabled = async (value: boolean) => {
    await biometricStore.setEnabled(value);
    setEnabledState(value && available);
    if (!value) setLocked(false);
  };

  const unlock = async () => {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloquear o app' });
    if (result.success) setLocked(false);
    return result.success;
  };

  return (
    <BiometricLockContext.Provider value={{ available, enabled, locked, ready, setEnabled, unlock }}>
      {children}
    </BiometricLockContext.Provider>
  );
}

export function useBiometricLock() {
  const context = useContext(BiometricLockContext);
  if (!context) throw new Error('useBiometricLock precisa estar dentro de <BiometricLockProvider>');
  return context;
}
