import { Button, Link, Text } from '@react-email/components';
import { buttonStyle, EmailLayout } from './layout';

export function VerifyEmailEmail({
  name,
  verifyUrl,
}: {
  name: string;
  verifyUrl: string;
}) {
  return (
    <EmailLayout title="Confirme seu e-mail">
      <Text>Olá, {name}! Bem-vindo(a).</Text>
      <Text>
        Confirme o seu endereço de e-mail para habilitar a recuperação de senha
        e os convites de workspace.
      </Text>
      <Button href={verifyUrl} style={buttonStyle}>
        Confirmar e-mail
      </Button>
      <Text style={{ color: '#71717a', fontSize: 12, marginTop: 16 }}>
        Se o botão não funcionar, copie e cole este link no navegador:{' '}
        <Link href={verifyUrl}>{verifyUrl}</Link>
      </Text>
    </EmailLayout>
  );
}
