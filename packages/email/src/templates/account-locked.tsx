import { Text } from "@react-email/components";
import { EmailLayout } from "./layout";

export function AccountLockedEmail({ name, minutes }: { name: string; minutes: number }) {
  return (
    <EmailLayout title="Atividade suspeita na sua conta">
      <Text>Olá, {name}.</Text>
      <Text>
        Detectamos várias tentativas de login malsucedidas e travamos temporariamente o acesso à
        sua conta por {minutes} {minutes === 1 ? "minuto" : "minutos"}.
      </Text>
      <Text>
        Se foi você, basta aguardar e tentar de novo. Se não reconhece essas tentativas,
        recomendamos redefinir a sua senha assim que o acesso for liberado.
      </Text>
    </EmailLayout>
  );
}
