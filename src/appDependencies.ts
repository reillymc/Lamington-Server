import { AttachmentActions } from "./controllers/attachment.ts";
import type { Database, KnexDatabase } from "./database/index.ts";
import type { AppRepositories } from "./repositories/index.ts";
import { KnexBookRepository } from "./repositories/knex/knexBookRepository.ts";
import { KnexCookListRepository } from "./repositories/knex/knexCooklistRepository.ts";
import { KnexMealRepository } from "./repositories/knex/knexMealRepository.ts";
import { KnexPlannerRepository } from "./repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "./repositories/knex/knexRecipeRepository.ts";
import type { AppServices } from "./services/index.ts";
import { createBookService } from "./services/bookService.ts";
import { createContentExtractionService } from "./services/contentExtractionService.ts";
import { createCooklistService } from "./services/cooklistService.ts";
import { createMealService } from "./services/mealService.ts";
import { createPlannerService } from "./services/plannerService.ts";
import { createRecipeService } from "./services/recipeService.ts";
import { LocalAttachmentService, type AttachmentService } from "./services/attachment/index.ts";

export const DefaultAppRepositories: AppRepositories<KnexDatabase> = {
    bookRepository: KnexBookRepository,
    cooklistRepository: KnexCookListRepository,
    mealRepository: KnexMealRepository,
    plannerRepository: KnexPlannerRepository,
    recipeRepository: KnexRecipeRepository,
};

export type ServiceDependencies<T extends Database = Database> = AppRepositories<T> & {
    database: Database;
};

export const DefaultAppServices = (database: Database): AppServices => ({
    bookService: createBookService(database, DefaultAppRepositories as ServiceDependencies),
    contentExtractionService: createContentExtractionService(),
    cooklistService: createCooklistService(database, DefaultAppRepositories as ServiceDependencies),
    mealService: createMealService(database, DefaultAppRepositories as ServiceDependencies),
    plannerService: createPlannerService(database, DefaultAppRepositories as ServiceDependencies),
    recipeService: createRecipeService(database, DefaultAppRepositories as ServiceDependencies),
});

export type AppDependencies<T extends Database = Database> = {
    services: AppServices;
    repositories: AppRepositories<T>;
    attachmentService: AttachmentService;
    attachmentActions: AttachmentActions;
    database: Database;
};

export const DefaultAppDependencies = (database: Database): AppDependencies => ({
    services: DefaultAppServices(database),
    repositories: DefaultAppRepositories as AppRepositories,
    attachmentService: LocalAttachmentService,
    attachmentActions: AttachmentActions,
    database,
});
