import { Redirect, useLocalSearchParams } from 'expo-router';

import { NewPasswordForm } from '@/components/forms/new-password-form';
import { AuthHeader } from '@/components/ui/auth-header';
import { Screen } from '@/components/ui/screen';

export default function NewPasswordScreen() {
  const { email, code } = useLocalSearchParams<{
    email?: string;
    code?: string;
  }>();

  // Chegou direto (sem passar pelo passo do código) — manda de volta pro início do fluxo.
  if (!email || !code) {
    return <Redirect href="/reset-password" />;
  }

  return (
    <Screen center>
      <AuthHeader
        title="Nova senha"
        subtitle="Escolha e confirme a sua nova senha"
      />
      <NewPasswordForm email={email} code={code} />
    </Screen>
  );
}
