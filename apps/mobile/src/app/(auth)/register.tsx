import { RegisterForm } from '@/components/forms/register-form';
import { AuthHeader } from '@/components/ui/auth-header';
import { Screen } from '@/components/ui/screen';

export default function RegisterScreen() {
  return (
    <Screen center>
      <AuthHeader title="Criar conta" subtitle="Leva menos de um minuto" />
      <RegisterForm />
    </Screen>
  );
}
