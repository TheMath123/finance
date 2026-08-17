import { LoginForm } from '@/components/forms/login-form';
import { AuthHeader } from '@/components/ui/auth-header';
import { Screen } from '@/components/ui/screen';

export default function LoginScreen() {
  return (
    <Screen center>
      <AuthHeader
        title="Bem-vindo de volta"
        subtitle="Entre para ver o resumo das suas finanças"
      />
      <LoginForm />
    </Screen>
  );
}
