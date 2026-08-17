import { ForgotPasswordForm } from '@/components/forms/forgot-password-form';
import { AuthHeader } from '@/components/ui/auth-header';
import { Screen } from '@/components/ui/screen';

export default function ForgotPasswordScreen() {
  return (
    <Screen center>
      <AuthHeader
        title="Esqueci minha senha"
        subtitle="Informe seu e-mail para receber o código de redefinição"
      />
      <ForgotPasswordForm />
    </Screen>
  );
}
