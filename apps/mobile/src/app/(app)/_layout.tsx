import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/context/session';

/**
 * As 3 telas de tab (Resumo/Transações/Contas) ficam no grupo (tabs), que
 * renderiza a barra customizada (AppTabs). Toda tela fora desse grupo — edição,
 * criação, listas dedicadas (cartões, categorias, perfil, lixeira) — é
 * empilhada por este Stack por cima da tab bar, cobrindo a tela toda. Sem
 * isso, o Tabs headless (expo-router/ui) só conhece as 3 rotas registradas
 * como TabTrigger e ignora silenciosamente qualquer push pra rota irmã.
 */
export default function AppLayout() {
  const { user, isLoading } = useSession();

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
