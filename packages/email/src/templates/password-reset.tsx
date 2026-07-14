import { Button, Text } from "@react-email/components";
import { EmailLayout, buttonStyle } from "./layout";

export function PasswordResetEmail({ name, resetUrl }: { name: string; resetUrl: string }) {
  return (
    <EmailLayout title="Redefinição de senha">
      <Text>Olá, {name}!</Text>
      <Text>
        Recebemos um pedido para redefinir a sua senha. O link abaixo é válido por 30 minutos e só
        pode ser usado uma vez:
      </Text>
      <Button href={resetUrl} style={buttonStyle}>
        Redefinir senha
      </Button>
    </EmailLayout>
  );
}
