/**
 * Detecta violação de unique constraint (Postgres: `23505`) numa corrida de escrita
 * concorrente — usado quando a checagem prévia não é suficiente (ex.: dois registros
 * simultâneos do mesmo e-mail). Ponto único de conhecimento sobre o código do driver.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
