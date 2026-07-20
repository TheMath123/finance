import { Text } from "@react-email/components";
import { EmailLayout } from "./layout";

/** Enviado para o e-mail ANTIGO depois que a troca é confirmada (aviso de segurança — se não foi o dono, ele fica sabendo). */
export function EmailChangedEmail({ name, newEmail }: { name: string; newEmail: string }) {
  return (
    <EmailLayout title="O e-mail da sua conta foi alterado">
      <Text>Olá, {name}.</Text>
      <Text>
        O e-mail da sua conta foi alterado para <strong>{newEmail}</strong>. Este endereço não é
        mais usado para acessar a conta.
      </Text>
      <Text>Se não foi você, entre em contato com o suporte imediatamente.</Text>
    </EmailLayout>
  );
}
