import config from "./config.ts";
import db from "./database/index.ts";
import { createErrorHandlerMiddleware } from "./middleware/errorHandler.ts";
import type { AppMiddleware } from "./middleware/index.ts";
import { createLoggerMiddleware } from "./middleware/logger.ts";
import { createNotFoundMiddleware } from "./middleware/notFound.ts";
import {
    createRateLimiterControlled,
    createRateLimiterLoose,
    createRateLimiterRestrictive,
} from "./middleware/rateLimiters.ts";
import { createValidatorMiddleware } from "./middleware/validator.ts";
import { DiskFileRepository } from "./repositories/disk/diskFileRepository.ts";
import type { AppRepositories, Database } from "./repositories/index.ts";
import { KnexAttachmentRepository } from "./repositories/knex/knexAttachmentRepository.ts";
import { KnexBookRepository } from "./repositories/knex/knexBookRepository.ts";
import { KnexCookListRepository } from "./repositories/knex/knexCooklistRepository.ts";
import { KnexListRepository } from "./repositories/knex/knexListRepository.ts";
import { KnexMealRepository } from "./repositories/knex/knexMealRepository.ts";
import { KnexPlannerRepository } from "./repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "./repositories/knex/knexRecipeRepository.ts";
import { KnexTagRepository } from "./repositories/knex/knexTagRepository.ts";
import { KnexUserRepository } from "./repositories/knex/knexUserRepository.ts";
import { S3FileRepository } from "./repositories/s3/s3FileRepository.ts";

import { createAttachmentService } from "./services/attachmentService.ts";
import { createBookService } from "./services/bookService.ts";
import { createContentExtractionService } from "./services/contentExtractionService.ts";
import { createCooklistService } from "./services/cooklistService.ts";
import type { AppServices } from "./services/index.ts";
import { createListService } from "./services/listService.ts";
import { createMealService } from "./services/mealService.ts";
import { createPlannerService } from "./services/plannerService.ts";
import { createRecipeService } from "./services/recipeService.ts";
import { createTagService } from "./services/tagService.ts";
import { createUserService } from "./services/userService.ts";

// biome-ignore lint/suspicious/noExplicitAny: hypothetically support any db types
const DefaultAppRepositories: AppRepositories<any> = {
    bookRepository: KnexBookRepository,
    cooklistRepository: KnexCookListRepository,
    listRepository: KnexListRepository,
    mealRepository: KnexMealRepository,
    plannerRepository: KnexPlannerRepository,
    recipeRepository: KnexRecipeRepository,
    userRepository: KnexUserRepository,
    tagRepository: KnexTagRepository,
    attachmentRepository: KnexAttachmentRepository,
    fileRepository:
        config.attachments.storageService === "local"
            ? DiskFileRepository
            : S3FileRepository,
};

export const DefaultAppServices = (
    database: Database = db,
    repositoriesOverrides: Partial<AppRepositories> = {},
): AppServices => {
    const repositories = {
        ...DefaultAppRepositories,
        ...repositoriesOverrides,
    };
    return {
        attachmentService: createAttachmentService(database, repositories),
        bookService: createBookService(database, repositories),
        contentExtractionService: createContentExtractionService(),
        cooklistService: createCooklistService(database, repositories),
        listService: createListService(database, repositories),
        mealService: createMealService(database, repositories),
        plannerService: createPlannerService(database, repositories),
        recipeService: createRecipeService(database, repositories),
        tagService: createTagService(database, repositories),
        userService: createUserService(database, repositories),
    };
};

export const DefaultAppMiddleware = (): AppMiddleware => ({
    rateLimiterControlled: createRateLimiterControlled(),
    rateLimiterLoose: createRateLimiterLoose(),
    rateLimiterRestrictive: createRateLimiterRestrictive(),
    validator: createValidatorMiddleware(),
    errorHandler: createErrorHandlerMiddleware(),
    logger: createLoggerMiddleware(),
    notFound: createNotFoundMiddleware(),
});
