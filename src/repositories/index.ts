import type { Database } from "../database/index.ts";
import type { BookRepository } from "./bookRepository.ts";
import type { CookListRepository } from "./cooklistRepository.ts";
import type { MealRepository } from "./mealRepository.ts";
import type { PlannerRepository } from "./plannerRepository.ts";
import type { RecipeRepository } from "./recipeRepository.ts";

export type AppRepositories<T extends Database = Database> = {
    bookRepository: BookRepository<T>;
    cooklistRepository: CookListRepository<T>;
    mealRepository: MealRepository<T>;
    plannerRepository: PlannerRepository<T>;
    recipeRepository: RecipeRepository<T>;
};
