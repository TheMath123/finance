import type { CategoryError } from "../../../application/use-cases/category";
import type { HttpError } from "../../http-error";

export const CATEGORY_ERRORS: Record<CategoryError, HttpError> = {
  category_not_found: {
    status: 404,
    code: "category_not_found",
    message: "Categoria não encontrada.",
  },
  default_category_protected: {
    status: 409,
    code: "default_category_protected",
    message: "Categorias padrão não podem ser editadas ou excluídas.",
  },
};
