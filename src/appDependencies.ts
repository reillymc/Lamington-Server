import { AttachmentActions } from "./controllers/attachment.ts";

import type { Database, KnexDatabase } from "./database/index.ts";

import type { AppRepositories } from "./repositories/index.ts";
import { KnexBookRepository } from "./repositories/knex/knexBookRepository.ts";
import { KnexCookListRepository } from "./repositories/knex/knexCooklistRepository.ts";
import { KnexListRepository } from "./repositories/knex/knexListRepository.ts";
import { KnexMealRepository } from "./repositories/knex/knexMealRepository.ts";
import { KnexPlannerRepository } from "./repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "./repositories/knex/knexRecipeRepository.ts";
import { KnexUserRepository } from "./repositories/knex/knexUserRepository.ts";

import type { AppServices } from "./services/index.ts";
import { createBookService } from "./services/bookService.ts";
import { createContentExtractionService } from "./services/contentExtractionService.ts";
import { createCooklistService } from "./services/cooklistService.ts";
import { createListService } from "./services/listService.ts";
import { createMealService } from "./services/mealService.ts";
import { createPlannerService } from "./services/plannerService.ts";
import { createRecipeService } from "./services/recipeService.ts";
import { createUserService } from "./services/userService.ts";
import { LocalAttachmentService, S3AttachmentService, type AttachmentService } from "./services/attachment/index.ts";

import config from "./config.ts";

export const DefaultAppRepositories: AppRepositories<KnexDatabase> = {
    bookRepository: KnexBookRepository,
    cooklistRepository: KnexCookListRepository,
    listRepository: KnexListRepository,
    mealRepository: KnexMealRepository,
    plannerRepository: KnexPlannerRepository,
    recipeRepository: KnexRecipeRepository,
    userRepository: KnexUserRepository,
};

export type ServiceDependencies<T extends Database = Database> = AppRepositories<T> & {
    database: Database;
};

export const DefaultAppServices = (database: Database): AppServices => ({
    bookService: createBookService(database, DefaultAppRepositories as ServiceDependencies),
    contentExtractionService: createContentExtractionService(),
    cooklistService: createCooklistService(database, DefaultAppRepositories as ServiceDependencies),
    listService: createListService(database, DefaultAppRepositories as ServiceDependencies),
    mealService: createMealService(database, DefaultAppRepositories as ServiceDependencies),
    plannerService: createPlannerService(database, DefaultAppRepositories as ServiceDependencies),
    recipeService: createRecipeService(database, DefaultAppRepositories as ServiceDependencies),
    userService: createUserService(database, DefaultAppRepositories as ServiceDependencies),
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
    attachmentService: config.attachments.storageService === "local" ? LocalAttachmentService : S3AttachmentService,
    attachmentActions: AttachmentActions,
    database,
});

export type PartialAppDependencies<T extends Database = Database> = Partial<{
    services: Partial<AppServices>;
    repositories: Partial<AppRepositories<T>>;
    attachmentService: AttachmentService;
    attachmentActions: AttachmentActions;
    database: Database;
}>;

export const MergeAppDependencies = <T extends Database = Database>(
    defaults: AppDependencies<T>,
    overrides: PartialAppDependencies = {}
): AppDependencies<T> => ({
    services: { ...defaults.services, ...overrides.services },
    repositories: { ...defaults.repositories, ...overrides.repositories },
    attachmentService: overrides.attachmentService ?? defaults.attachmentService,
    attachmentActions: overrides.attachmentActions ?? defaults.attachmentActions,
    database: overrides.database ?? defaults.database,
});
