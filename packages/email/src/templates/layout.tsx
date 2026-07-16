import { Body, Container, Heading, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

export function EmailLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <Container
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          margin: "40px auto",
          maxWidth: 480,
          padding: 32,
        }}
      >
        <Heading style={{ fontSize: 20, marginBottom: 16 }}>{title}</Heading>
        <Section>{children}</Section>
        <Text style={{ color: "#71717a", fontSize: 12, marginTop: 32 }}>
          Se você não solicitou este e-mail, pode ignorá-lo com segurança.
        </Text>
      </Container>
    </Body>
  );
}

/**
 * Código exibido como texto puro (não um link): esquemas customizados
 * (mobile://...) são removidos por Gmail/Outlook/etc. em botões de e-mail,
 * então o app pede pro usuário copiar e colar o código em vez de clicar.
 */
export const codeBoxStyle = {
  backgroundColor: "#f4f4f5",
  border: "1px solid #e4e4e7",
  borderRadius: 8,
  color: "#18181b",
  display: "block",
  fontFamily: "monospace",
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: 1,
  padding: "14px 16px",
  textAlign: "center",
  wordBreak: "break-all",
} as const;
