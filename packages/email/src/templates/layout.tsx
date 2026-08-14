import {
  Body,
  Container,
  Heading,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

export function EmailLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Body
      style={{
        backgroundColor: '#f4f4f5',
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
    >
      <Container
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          margin: '40px auto',
          maxWidth: 480,
          padding: 32,
        }}
      >
        <Heading style={{ fontSize: 20, marginBottom: 16 }}>{title}</Heading>
        <Section>{children}</Section>
        <Text style={{ color: '#71717a', fontSize: 12, marginTop: 32 }}>
          Se você não solicitou este e-mail, pode ignorá-lo com segurança.
        </Text>
      </Container>
    </Body>
  );
}

/**
 * Códigos de 6 dígitos (reset de senha, troca de e-mail, exclusão de conta)
 * continuam em texto puro pra copiar/colar no app — não são links.
 *
 * Deep links com esquema customizado (mobile://...) FORAM tentados (ver
 * tasks/done/07-deep-link-emails-auth.md) e abandonados: Gmail/Outlook/etc.
 * removem `<a href>` com esquema não-http(s) por segurança. Isso não se
 * aplica a links `https://` normais (ex: verify-email.tsx, que linka pro
 * dashboard web) — só esquemas customizados são filtrados.
 */
export const codeBoxStyle = {
  backgroundColor: '#f4f4f5',
  border: '1px solid #e4e4e7',
  borderRadius: 8,
  color: '#18181b',
  display: 'block',
  fontFamily: 'monospace',
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: 1,
  padding: '14px 16px',
  textAlign: 'center',
  wordBreak: 'break-all',
} as const;

/** Botão de ação em links `https://` (ex: confirmar e-mail) — ver comentário acima. */
export const buttonStyle = {
  backgroundColor: '#18181b',
  borderRadius: 8,
  color: '#ffffff',
  display: 'block',
  fontSize: 15,
  fontWeight: 600,
  padding: '12px 20px',
  textAlign: 'center',
  textDecoration: 'none',
} as const;
