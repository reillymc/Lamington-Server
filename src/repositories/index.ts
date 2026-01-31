import type { AttachmentRepository } from "./attachmentRepository.ts";
import type { BookRepository } from "./bookRepository.ts";
import type { CookListRepository } from "./cooklistRepository.ts";
import type { FileRepository } from "./fileRepository.ts";
import type { ListRepository } from "./listRepository.ts";
import type { MealRepository } from "./mealRepository.ts";
import type { PlannerRepository } from "./plannerRepository.ts";
import type { RecipeRepository } from "./recipeRepository.ts";
import type { Database } from "./repository.ts";
import type { TagRepository } from "./tagRepository.ts";
import type { UserRepository } from "./userRepository.ts";

export type AppRepositories<T extends Database = Database> = {
    attachmentRepository: AttachmentRepository<T>;
    bookRepository: BookRepository<T>;
    cooklistRepository: CookListRepository<T>;
    listRepository: ListRepository<T>;
    mealRepository: MealRepository<T>;
    plannerRepository: PlannerRepository<T>;
    recipeRepository: RecipeRepository<T>;
    tagRepository: TagRepository<T>;
    userRepository: UserRepository<T>;
    fileRepository: FileRepository;
};

export type { Database };
