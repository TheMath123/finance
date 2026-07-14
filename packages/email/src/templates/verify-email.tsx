import { Button, Text } from "@react-email/components";
import { EmailLayout, buttonStyle } from "./layout";

export function VerifyEmailEmail({ name, verifyUrl }: { name: string; verifyUrl: string }) {
  return (
    <EmailLayout title="Confirme seu e-mail">
      <Text>Olá, {name}! Bem-vindo(a).</Text>
      <Text>
        Confirme o seu endereço de e-mail para habilitar a recuperação de senha e os convites de
        workspace:
      </Text>
      <Button href={verifyUrl} style={buttonStyle}>
        Confirmar e-mail
      </Button>
    </EmailLayout>
  );
}
