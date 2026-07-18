import { Redirect, Stack } from 'expo-router';

import { BiometricLockScreen } from '@/components/biometric-lock-screen';
import { BiometricLockProvider, useBiometricLock } from '@/context/biometric-lock';
import { useSession } from '@/context/session';

/**
 * As 3 telas de tab (Resumo/Transações/Contas) ficam no grupo (tabs), que
 * renderiza a barra customizada (AppTabs). Toda tela fora desse grupo — edição,
 * criação, listas dedicadas (cartões, categorias, perfil, lixeira) — é
 * empilhada por este Stack por cima da tab bar, cobrindo a tela toda. Sem
 * isso, o Tabs headless (expo-router/ui) só conhece as 3 rotas registradas
 * como TabTrigger e ignora silenciosamente qualquer push pra rota irmã.
 */
function AppStack() {
  const { ready, locked } = useBiometricLock();
  if (ready && locked) return <BiometricLockScreen />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function AppLayout() {
  const { user, isLoading } = useSession();

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <BiometricLockProvider>
      <AppStack />
    </BiometricLockProvider>
  );
}
