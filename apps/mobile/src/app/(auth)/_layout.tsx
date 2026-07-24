import { type Href, Redirect, Stack } from 'expo-router';

import { useSession } from '@/context/session';

// "/" é o path correto em runtime para o index de "(app)", mas o gerador de
// tipos do expo-router não expõe esse literal (ver components/app-tabs.tsx).
const HOME_HREF = '/' as Href;

export default function AuthLayout() {
  const { user, isLoading } = useSession();

  if (isLoading) return null;
  if (user) return <Redirect href={HOME_HREF} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
