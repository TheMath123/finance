import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useSession } from '@/context/session';

export default function AppLayout() {
  const { user, isLoading } = useSession();

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;

  return <AppTabs />;
}
