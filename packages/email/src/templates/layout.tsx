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

export const buttonStyle = {
  backgroundColor: "#18181b",
  borderRadius: 8,
  color: "#ffffff",
  display: "inline-block",
  fontSize: 14,
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
} as const;
