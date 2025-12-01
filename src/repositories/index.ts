import type { Database } from "../database/index.ts";
import type { BookRepository } from "./bookRepository.ts";
import type { RecipeRepository } from "./recipeRepository.ts";

export type AppRepositories<T extends Database = Database> = {
    recipeRepository: RecipeRepository<T>;
    bookRepository: BookRepository<T>;
};
