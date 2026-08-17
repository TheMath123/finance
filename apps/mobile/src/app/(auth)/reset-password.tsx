import { useLocalSearchParams } from 'expo-router';

import { ResetPasswordForm } from '@/components/forms/reset-password-form';
import { AuthHeader } from '@/components/ui/auth-header';
import { Screen } from '@/components/ui/screen';

export default function ResetPasswordScreen() {
  const { email, code } = useLocalSearchParams<{
    email?: string;
    code?: string;
  }>();

  return (
    <Screen center>
      <AuthHeader
        title="Redefinir senha"
        subtitle="Confirme seu e-mail e informe o código de 6 dígitos recebido"
      />
      <ResetPasswordForm defaultEmail={email} defaultCode={code} />
    </Screen>
  );
}
