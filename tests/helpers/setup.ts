import knex from "knex";
import { v4 } from "uuid";
import { createLogger, transports } from "winston";
import { setupApp } from "../../src/app.ts";
import type { AppJobs } from "../../src/jobs/index.ts";
import { createErrorHandlerMiddleware } from "../../src/middleware/errorHandler.ts";
import type { AppMiddleware } from "../../src/middleware/index.ts";
import { createLoggerMiddleware } from "../../src/middleware/logger.ts";
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
import { KnexAttachmentRepository } from "../../src/repositories/knex/knexAttachmentRepository.ts";
import { KnexBookRepository } from "../../src/repositories/knex/knexBookRepository.ts";
import { KnexCookListRepository } from "../../src/repositories/knex/knexCooklistRepository.ts";
import { KnexIngredientRepository } from "../../src/repositories/knex/knexIngredientRepository.ts";
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
import { createIngredientService } from "../../src/services/ingredientService.ts";
import { createListService } from "../../src/services/listService.ts";
import { createMealService } from "../../src/services/mealService.ts";
import { createPlannerService } from "../../src/services/plannerService.ts";
import { createRecipeService } from "../../src/services/recipeService.ts";
import { createTagService } from "../../src/services/tagService.ts";
import { createUserService } from "../../src/services/userService.ts";
import testConfig from "./knexfile.testing.ts";

export const accessSecret = v4();
export const refreshSecret = v4();

const defaultAppRepositories: AppRepositories = {
    attachmentRepository: KnexAttachmentRepository,
    bookRepository: KnexBookRepository,
    cooklistRepository: KnexCookListRepository,
    fileRepository: {
        create: async () => "uri://",
        delete: async () => true,
    },
    ingredientRepository: KnexIngredientRepository,
    listRepository: KnexListRepository,
    mealRepository: KnexMealRepository,
    plannerRepository: KnexPlannerRepository,
    recipeRepository: KnexRecipeRepository,
    tagRepository: KnexTagRepository,
    userRepository: KnexUserRepository,
};

export const silentLogger = createLogger({
    transports: [new transports.Console({ silent: true })],
});

const defaultAppMiddleware: AppMiddleware = {
    validator: createValidatorMiddleware({ accessSecret }),
    errorHandler: createErrorHandlerMiddleware({ logger: silentLogger }),
    logger: createLoggerMiddleware({ logger: silentLogger }),
    rateLimiterControlled: createRateLimiterControlled(),
    rateLimiterLoose: createRateLimiterLoose(),
    rateLimiterRestrictive: createRateLimiterRestrictive(),
};

const defaultAppJobs: AppJobs = {
    refreshIngredientsAsset: {
        run: async () => true,
    },
    createUserStarterData: {
        run: async () => true,
    },
};

export const db = knex(testConfig);

export const createTestApp = ({
    database,
    repositories,
    middleware,
    services,
    jobs,
}: {
    database: Database;
    repositories?: Partial<AppRepositories>;
    middleware?: Partial<AppMiddleware>;
    services?: Partial<AppServices>;
    jobs?: Partial<AppJobs>;
}) => {
    const appRepositories = {
        ...defaultAppRepositories,
        ...repositories,
    };

    const appJobs = {
        ...defaultAppJobs,
        ...jobs,
    };

    return setupApp({
        services: {
            attachmentService: createAttachmentService(
                database,
                appRepositories,
            ),
            bookService: createBookService(database, appRepositories),
            contentExtractionService: createContentExtractionService(
                database,
                appRepositories,
            ),
            cooklistService: createCooklistService(database, appRepositories),
            ingredientService: createIngredientService(
                database,
                appRepositories,
                appJobs,
            ),
            listService: createListService(database, appRepositories),
            mealService: createMealService(database, appRepositories),
            plannerService: createPlannerService(database, appRepositories),
            recipeService: createRecipeService(database, appRepositories),
            tagService: createTagService(database, appRepositories),
            userService: createUserService(database, appRepositories, appJobs, {
                accessExpiration: 1000,
                accessSecret,
                refreshExpiration: 1000,
                refreshSecret,
            }),
            ...services,
        },
        middleware: {
            ...defaultAppMiddleware,
            rateLimiterControlled: createRateLimiterControlled(),
            rateLimiterLoose: createRateLimiterLoose(),
            rateLimiterRestrictive: createRateLimiterRestrictive(),
            ...middleware,
        },
        config: {
            allowedOrigin: "test.origin",
            externalHost: "https://test.host",
            uploadDirectory: "uploads",
            assetDirectory: "tests/resources/testAssets",
        },
    });
};
