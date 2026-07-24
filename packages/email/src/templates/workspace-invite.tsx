import { Text } from '@react-email/components';
import { EmailLayout } from './layout';

export function WorkspaceInviteEmail({
  inviterName,
  workspaceName,
}: {
  inviterName: string;
  workspaceName: string;
}) {
  return (
    <EmailLayout title="Convite para workspace">
      <Text>
        {inviterName} convidou você para participar do workspace{' '}
        <strong>{workspaceName}</strong>.
      </Text>
      <Text>
        Abra o app e veja o convite na tela "Convites" pra aceitar ou recusar.
      </Text>
    </EmailLayout>
  );
}
