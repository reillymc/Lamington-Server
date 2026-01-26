import config from "./config.ts";
import { AttachmentActions } from "./controllers/attachment.ts";
import type { Database, KnexDatabase } from "./database/index.ts";
import type { AppMiddleware } from "./middleware/index.ts";
import {
    createRateLimiterControlled,
    createRateLimiterLoose,
    createRateLimiterRestrictive,
} from "./middleware/rateLimiters.ts";
import type { AppRepositories } from "./repositories/index.ts";
import { KnexBookRepository } from "./repositories/knex/knexBookRepository.ts";
import { KnexCookListRepository } from "./repositories/knex/knexCooklistRepository.ts";
import { KnexListRepository } from "./repositories/knex/knexListRepository.ts";
import { KnexMealRepository } from "./repositories/knex/knexMealRepository.ts";
import { KnexPlannerRepository } from "./repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "./repositories/knex/knexRecipeRepository.ts";
import { KnexUserRepository } from "./repositories/knex/knexUserRepository.ts";
import {
    type AttachmentService,
    LocalAttachmentService,
    S3AttachmentService,
} from "./services/attachment/index.ts";
import { createBookService } from "./services/bookService.ts";
import { createContentExtractionService } from "./services/contentExtractionService.ts";
import { createCooklistService } from "./services/cooklistService.ts";
import type { AppServices } from "./services/index.ts";
import { createListService } from "./services/listService.ts";
import { createMealService } from "./services/mealService.ts";
import { createPlannerService } from "./services/plannerService.ts";
import { createRecipeService } from "./services/recipeService.ts";
import { createUserService } from "./services/userService.ts";

export const DefaultAppRepositories: AppRepositories<KnexDatabase> = {
    bookRepository: KnexBookRepository,
    cooklistRepository: KnexCookListRepository,
    listRepository: KnexListRepository,
    mealRepository: KnexMealRepository,
    plannerRepository: KnexPlannerRepository,
    recipeRepository: KnexRecipeRepository,
    userRepository: KnexUserRepository,
};

export type ServiceDependencies<T extends Database = Database> =
    AppRepositories<T> & {
        database: Database;
    };

export const DefaultAppServices = (database: Database): AppServices => ({
    bookService: createBookService(
        database,
        DefaultAppRepositories as ServiceDependencies,
    ),
    contentExtractionService: createContentExtractionService(),
    cooklistService: createCooklistService(
        database,
        DefaultAppRepositories as ServiceDependencies,
    ),
    listService: createListService(
        database,
        DefaultAppRepositories as ServiceDependencies,
    ),
    mealService: createMealService(
        database,
        DefaultAppRepositories as ServiceDependencies,
    ),
    plannerService: createPlannerService(
        database,
        DefaultAppRepositories as ServiceDependencies,
    ),
    recipeService: createRecipeService(
        database,
        DefaultAppRepositories as ServiceDependencies,
    ),
    userService: createUserService(
        database,
        DefaultAppRepositories as ServiceDependencies,
    ),
});

const DefaultAppMiddleware = (): AppMiddleware => ({
    rateLimiterControlled: createRateLimiterControlled(),
    rateLimiterLoose: createRateLimiterLoose(),
    rateLimiterRestrictive: createRateLimiterRestrictive(),
});

export type AppDependencies<T extends Database = Database> = {
    attachmentActions: AttachmentActions;
    attachmentService: AttachmentService;
    database: Database;
    middleware: AppMiddleware;
    repositories: AppRepositories<T>;
    services: AppServices;
};

export const DefaultAppDependencies = (
    database: Database,
): AppDependencies => ({
    attachmentActions: AttachmentActions,
    attachmentService:
        config.attachments.storageService === "local"
            ? LocalAttachmentService
            : S3AttachmentService,
    database,
    middleware: DefaultAppMiddleware(),
    repositories: DefaultAppRepositories as AppRepositories,
    services: DefaultAppServices(database),
});

export type PartialAppDependencies<T extends Database = Database> = Partial<{
    attachmentActions: AttachmentActions;
    attachmentService: AttachmentService;
    database: Database;
    middleware: Partial<AppMiddleware>;
    repositories: Partial<AppRepositories<T>>;
    services: Partial<AppServices>;
}>;

export const MergeAppDependencies = <T extends Database = Database>(
    defaults: AppDependencies<T>,
    overrides: PartialAppDependencies = {},
): AppDependencies<T> => ({
    services: { ...defaults.services, ...overrides.services },
    repositories: { ...defaults.repositories, ...overrides.repositories },
    attachmentService:
        overrides.attachmentService ?? defaults.attachmentService,
    attachmentActions:
        overrides.attachmentActions ?? defaults.attachmentActions,
    database: overrides.database ?? defaults.database,
    middleware: { ...defaults.middleware, ...(overrides.middleware ?? {}) },
});
