import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/context/session';

export default function AuthLayout() {
  const { user, isLoading } = useSession();

  if (isLoading) return null;
  if (user) return <Redirect href="/index" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
