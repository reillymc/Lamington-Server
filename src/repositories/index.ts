import type { AttachmentRepository } from "./attachmentRepository.ts";
import type { BookRepository } from "./bookRepository.ts";
import type { CookListRepository } from "./cooklistRepository.ts";
import type { FileRepository } from "./fileRepository.ts";
import type { IngredientRepository } from "./ingredientRepository.ts";
import type { ListRepository } from "./listRepository.ts";
import type { MealRepository } from "./mealRepository.ts";
import type { PlannerRepository } from "./plannerRepository.ts";
import type { RecipeRepository } from "./recipeRepository.ts";
import type { TagRepository } from "./tagRepository.ts";
import type { UserRepository } from "./userRepository.ts";

export type AppRepositories = {
    attachmentRepository: AttachmentRepository;
    bookRepository: BookRepository;
    cooklistRepository: CookListRepository;
    fileRepository: FileRepository;
    ingredientRepository: IngredientRepository;
    listRepository: ListRepository;
    mealRepository: MealRepository;
    plannerRepository: PlannerRepository;
    recipeRepository: RecipeRepository;
    tagRepository: TagRepository;
    userRepository: UserRepository;
};
