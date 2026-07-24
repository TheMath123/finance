import { Text } from '@react-email/components';
import { EmailLayout } from './layout';

export function PasswordChangedEmail({ name }: { name: string }) {
  return (
    <EmailLayout title="Sua senha foi alterada">
      <Text>Olá, {name}.</Text>
      <Text>
        A senha da sua conta acabou de ser alterada e todas as sessões ativas
        foram encerradas. Se não foi você, redefina a senha imediatamente e
        entre em contato com o suporte.
      </Text>
    </EmailLayout>
  );
}
