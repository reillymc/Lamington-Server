import type { BookService } from "./bookService.ts";
import type { ContentExtractionService } from "./contentExtractionService.ts";
import type { MealService } from "./mealService.ts";
import type { CooklistService } from "./cooklistService.ts";
import type { RecipeService } from "./recipeService.ts";
import type { PlannerService } from "./plannerService.ts";
import type { ListService } from "./listService.ts";

export { printConfig } from "./console.ts";
export * from "./logging.ts";
export * from "./password.ts";
export * from "./token.ts";

export type AppServices = {
    bookService: BookService;
    contentExtractionService: ContentExtractionService;
    cooklistService: CooklistService;
    listService: ListService;
    mealService: MealService;
    plannerService: PlannerService;
    recipeService: RecipeService;
};
