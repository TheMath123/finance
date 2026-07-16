import { Text } from "@react-email/components";
import { EmailLayout, codeBoxStyle } from "./layout";

export function PasswordResetEmail({ name, code }: { name: string; code: string }) {
  return (
    <EmailLayout title="Redefinição de senha">
      <Text>Olá, {name}!</Text>
      <Text>
        Recebemos um pedido para redefinir a sua senha. Copie o código abaixo e cole no app — ele
        é válido por 30 minutos e só pode ser usado uma vez:
      </Text>
      <Text style={codeBoxStyle}>{code}</Text>
    </EmailLayout>
  );
}
