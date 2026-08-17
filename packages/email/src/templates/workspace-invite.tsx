import { Button, Link, Text } from '@react-email/components';
import { buttonStyle, EmailLayout } from './layout';

export function WorkspaceInviteEmail({
  inviterName,
  workspaceName,
  inviteUrl,
}: {
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
}) {
  return (
    <EmailLayout title="Convite para workspace">
      <Text>
        {inviterName} convidou você para participar do workspace{' '}
        <strong>{workspaceName}</strong>.
      </Text>
      <Button href={inviteUrl} style={buttonStyle}>
        Ver convite
      </Button>
      <Text style={{ color: '#71717a', fontSize: 12, marginTop: 16 }}>
        Se o botão não funcionar, copie e cole este link no navegador:{' '}
        <Link href={inviteUrl}>{inviteUrl}</Link>
      </Text>
    </EmailLayout>
  );
}
