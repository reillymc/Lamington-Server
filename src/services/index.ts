import type { AttachmentService } from "./attachmentService.ts";
import type { BookService } from "./bookService.ts";
import type { ContentExtractionService } from "./contentExtractionService.ts";
import type { CooklistService } from "./cooklistService.ts";
import type { ListService } from "./listService.ts";
import type { MealService } from "./mealService.ts";
import type { PlannerService } from "./plannerService.ts";
import type { RecipeService } from "./recipeService.ts";
import type { TagService } from "./tagService.ts";
import type { UserService } from "./userService.ts";

export { printConfig } from "./console.ts";
export * from "./logging.ts";
export * from "./token.ts";

export type AppServices = {
    attachmentService: AttachmentService;
    bookService: BookService;
    contentExtractionService: ContentExtractionService;
    cooklistService: CooklistService;
    listService: ListService;
    mealService: MealService;
    plannerService: PlannerService;
    recipeService: RecipeService;
    tagService: TagService;
    userService: UserService;
};
