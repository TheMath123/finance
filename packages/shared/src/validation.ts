import { z } from "zod";

/**
 * Campo que aceita e-mail OU telefone de um usuário já cadastrado (convite de
 * workspace, transferência entre usuários). Normaliza e-mail pra minúsculas
 * (a busca por usuário é sempre case-insensitive — mesma regra de
 * cadastro/login) sem mexer no telefone; centralizado aqui pra nenhum novo
 * campo desse tipo esquecer a normalização (bug real: `create-transfer.ts`
 * comparava o valor cru, então um e-mail digitado com maiúscula nunca
 * encontrava o destinatário e a transferência falhava nos dois lados).
 */
export const emailOrPhoneSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .transform((value) => (value.includes("@") ? value.toLowerCase() : value));
