import knex from "knex";
import { v4 } from "uuid";
import { setupApp } from "../../src/app.ts";
import config from "../../src/config.ts";
import { createErrorHandlerMiddleware } from "../../src/middleware/errorHandler.ts";
import type { AppMiddleware } from "../../src/middleware/index.ts";
import { createLoggerMiddleware } from "../../src/middleware/logger.ts";
import { createNotFoundMiddleware } from "../../src/middleware/notFound.ts";
import {
    createRateLimiterControlled,
    createRateLimiterLoose,
    createRateLimiterRestrictive,
} from "../../src/middleware/rateLimiters.ts";
import { createValidatorMiddleware } from "../../src/middleware/validator.ts";
import type {
    AppRepositories,
    Database,
} from "../../src/repositories/index.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexAttachmentRepository } from "../../src/repositories/knex/knexAttachmentRepository.ts";
import { KnexBookRepository } from "../../src/repositories/knex/knexBookRepository.ts";
import { KnexCookListRepository } from "../../src/repositories/knex/knexCooklistRepository.ts";
import { KnexListRepository } from "../../src/repositories/knex/knexListRepository.ts";
import { KnexMealRepository } from "../../src/repositories/knex/knexMealRepository.ts";
import { KnexPlannerRepository } from "../../src/repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import { KnexTagRepository } from "../../src/repositories/knex/knexTagRepository.ts";
import { KnexUserRepository } from "../../src/repositories/knex/knexUserRepository.ts";
import { createAttachmentService } from "../../src/services/attachmentService.ts";
import { createBookService } from "../../src/services/bookService.ts";
import { createContentExtractionService } from "../../src/services/contentExtractionService.ts";
import { createCooklistService } from "../../src/services/cooklistService.ts";
import type { AppServices } from "../../src/services/index.ts";
import { createListService } from "../../src/services/listService.ts";
import { createMealService } from "../../src/services/mealService.ts";
import { createPlannerService } from "../../src/services/plannerService.ts";
import { createRecipeService } from "../../src/services/recipeService.ts";
import { createTagService } from "../../src/services/tagService.ts";
import { createUserService } from "../../src/services/userService.ts";
import testConfig from "./knexfile.testing.ts";

const defaultAppRepositories: AppRepositories<KnexDatabase> = {
    bookRepository: KnexBookRepository,
    cooklistRepository: KnexCookListRepository,
    listRepository: KnexListRepository,
    mealRepository: KnexMealRepository,
    plannerRepository: KnexPlannerRepository,
    recipeRepository: KnexRecipeRepository,
    userRepository: KnexUserRepository,
    tagRepository: KnexTagRepository,
    attachmentRepository: KnexAttachmentRepository,
    fileRepository: {
        create: async () => "uri://",
        delete: async () => true,
    },
};

export const accessSecret = v4();
export const refreshSecret = v4();

export const db = knex(testConfig);

export const createTestApp = ({
    database,
    repositories,
    middleware,
    services,
}: {
    database: Database;
    repositories?: Partial<AppRepositories>;
    middleware?: Partial<AppMiddleware>;
    services?: Partial<AppServices>;
}) => {
    const appRepositories = {
        ...defaultAppRepositories,
        ...repositories,
    } as AppRepositories<Database>;

    return setupApp({
        services: {
            attachmentService: createAttachmentService(
                database,
                appRepositories,
            ),
            bookService: createBookService(database, appRepositories),
            contentExtractionService: createContentExtractionService(),
            cooklistService: createCooklistService(database, appRepositories),
            listService: createListService(database, appRepositories),
            mealService: createMealService(database, appRepositories),
            plannerService: createPlannerService(database, appRepositories),
            recipeService: createRecipeService(database, appRepositories),
            tagService: createTagService(database, appRepositories),
            userService: createUserService(database, appRepositories, {
                accessExpiration: 1000,
                accessSecret,
                refreshExpiration: 1000,
                refreshSecret,
            }),
            ...services,
        },
        middleware: {
            validator: createValidatorMiddleware({ accessSecret }),
            errorHandler: createErrorHandlerMiddleware(),
            logger: createLoggerMiddleware(),
            notFound: createNotFoundMiddleware(),
            rateLimiterControlled: createRateLimiterControlled(),
            rateLimiterLoose: createRateLimiterLoose(),
            rateLimiterRestrictive: createRateLimiterRestrictive(),
            ...middleware,
        },
        config,
    });
};
