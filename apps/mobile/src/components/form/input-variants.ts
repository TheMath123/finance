import { cva } from "class-variance-authority";

/**
 * Estilo base compartilhado por text/number/password field — muda só em caso de erro.
 * Sem padding horizontal aqui de propósito: password-field precisa de padding assimétrico
 * (espaço pro ícone de mostrar/ocultar) e cada campo declara o seu via `cn(...)`.
 */
export const inputField = cva("rounded-xl border py-3 text-base dark:text-white", {
  variants: {
    error: {
      true: "border-danger",
      false: "border-neutral-300 dark:border-neutral-700",
    },
  },
  defaultVariants: {
    error: false,
  },
});
