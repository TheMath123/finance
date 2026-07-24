import { Text } from '@react-email/components';
import { codeBoxStyle, EmailLayout } from './layout';

/** Enviado pro próprio e-mail cadastrado pra autorizar a exclusão da conta (perfil). */
export function ConfirmAccountDeletionEmail({
  name,
  code,
}: {
  name: string;
  code: string;
}) {
  return (
    <EmailLayout title="Confirme a exclusão da sua conta">
      <Text>Olá, {name}.</Text>
      <Text>
        Recebemos um pedido para excluir permanentemente sua conta. Essa ação
        apaga todos os seus dados — transações, contas, cartões, categorias e
        faturas — e não pode ser desfeita. Copie o código abaixo e cole no app
        para confirmar:
      </Text>
      <Text style={codeBoxStyle}>{code}</Text>
      <Text>
        Se não foi você, ignore este e-mail — sua conta continuará normalmente.
      </Text>
    </EmailLayout>
  );
}
