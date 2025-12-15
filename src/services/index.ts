import type { BookService } from "./bookService.ts";
import type { RecipeService } from "./recipeService.ts";

export { printConfig } from "./console.ts";
export * from "./logging.ts";
export * from "./password.ts";
export * from "./token.ts";

export type AppServices = {
    recipeService: RecipeService;
    bookService: BookService;
};
