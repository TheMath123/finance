import type { HttpError } from "../../lib/http";

export type CategoryError = "category_not_found" | "fallback_not_deletable";

export const CATEGORY_ERRORS: Record<CategoryError, HttpError> = {
  category_not_found: {
    status: 404,
    code: "category_not_found",
    message: "Categoria não encontrada.",
  },
  fallback_not_deletable: {
    status: 409,
    code: "fallback_not_deletable",
    message: 'A categoria "Outros" não pode ser excluída.',
  },
};
