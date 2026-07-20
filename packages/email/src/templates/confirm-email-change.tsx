import { Text } from "@react-email/components";
import { EmailLayout, codeBoxStyle } from "./layout";

/** Enviado para o e-mail NOVO durante a troca de e-mail no perfil (prova de posse, mesmo padrão do reset de senha). */
export function ConfirmEmailChangeEmail({ name, code }: { name: string; code: string }) {
  return (
    <EmailLayout title="Confirme seu novo e-mail">
      <Text>Olá, {name}.</Text>
      <Text>
        Recebemos um pedido para tornar este endereço o e-mail da sua conta. Copie o código abaixo
        e cole no app para confirmar:
      </Text>
      <Text style={codeBoxStyle}>{code}</Text>
    </EmailLayout>
  );
}
