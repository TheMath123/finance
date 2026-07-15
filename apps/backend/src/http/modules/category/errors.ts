import type { CategoryError } from "../../../application/use-cases/category";
import type { HttpError } from "../../http-error";

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
