import { Button, Text } from "@react-email/components";
import { EmailLayout, buttonStyle } from "./layout";

export function WorkspaceInviteEmail({
  inviterName,
  workspaceName,
  acceptUrl,
}: {
  inviterName: string;
  workspaceName: string;
  acceptUrl: string;
}) {
  return (
    <EmailLayout title="Convite para workspace">
      <Text>
        {inviterName} convidou você para participar do workspace <strong>{workspaceName}</strong>.
      </Text>
      <Button href={acceptUrl} style={buttonStyle}>
        Aceitar convite
      </Button>
    </EmailLayout>
  );
}
