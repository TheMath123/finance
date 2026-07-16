import { Text } from "@react-email/components";
import { EmailLayout, codeBoxStyle } from "./layout";

export function VerifyEmailEmail({ name, code }: { name: string; code: string }) {
  return (
    <EmailLayout title="Confirme seu e-mail">
      <Text>Olá, {name}! Bem-vindo(a).</Text>
      <Text>
        Confirme o seu endereço de e-mail para habilitar a recuperação de senha e os convites de
        workspace. Copie o código abaixo e cole no app:
      </Text>
      <Text style={codeBoxStyle}>{code}</Text>
    </EmailLayout>
  );
}
