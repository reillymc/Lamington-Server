import { after, it } from "node:test";
import type { Express } from "express";
import knex from "knex";
import { v4 } from "uuid";
import { createLogger, transports } from "winston";
import { type AppParams, setupApp } from "../../src/app.ts";
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
import type { AppRepositories } from "../../src/repositories/index.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { createKnexAttachmentRepository } from "../../src/repositories/knex/knexAttachmentRepository.ts";
import { createKnexBookRepository } from "../../src/repositories/knex/knexBookRepository.ts";
import { createKnexCookListRepository } from "../../src/repositories/knex/knexCooklistRepository.ts";
import { createKnexIngredientRepository } from "../../src/repositories/knex/knexIngredientRepository.ts";
import { createKnexListRepository } from "../../src/repositories/knex/knexListRepository.ts";
import { createKnexMealRepository } from "../../src/repositories/knex/knexMealRepository.ts";
import { createKnexPlannerRepository } from "../../src/repositories/knex/knexPlannerRepository.ts";
import { createKnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import {
    createKnexTransactionRunner,
    createKnexTxStore,
} from "../../src/repositories/knex/knexRepository.ts";
import { createKnexTagRepository } from "../../src/repositories/knex/knexTagRepository.ts";
import { createKnexUserRepository } from "../../src/repositories/knex/knexUserRepository.ts";
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

const txStore = createKnexTxStore();

let currentDatabase: KnexDatabase | undefined;

const setCurrentDatabase = (database: KnexDatabase) => {
    currentDatabase = database;
};

/**
 * Runs a test body within the current test transaction context, so repository
 * calls resolve their transaction from the AsyncLocalStorage store.
 */
export const withCxIt = (name: string, fn: () => Promise<void> | void) => {
    it(name, () => {
        if (!currentDatabase) {
            return fn();
        }
        return txStore.run(currentDatabase, fn);
    });
};

const defaultAppRepositories: AppRepositories = {
    attachmentRepository: createKnexAttachmentRepository(txStore),
    bookRepository: createKnexBookRepository(txStore),
    cooklistRepository: createKnexCookListRepository(txStore),
    fileRepository: {
        create: async () => "uri://",
        delete: async () => true,
    },
    ingredientRepository: createKnexIngredientRepository(txStore),
    listRepository: createKnexListRepository(txStore),
    mealRepository: createKnexMealRepository(txStore),
    plannerRepository: createKnexPlannerRepository(txStore),
    recipeRepository: createKnexRecipeRepository(txStore),
    tagRepository: createKnexTagRepository(txStore),
    userRepository: createKnexUserRepository(txStore),
};

/**
 * The default set of Knex repository instances. Used by job and repository
 * tests which don't create an app.
 */
export const repositories = defaultAppRepositories;

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

const db = knex(testConfig);

after(async () => {
    await db.destroy();
});

/**
 * Returns the current test transaction handle. Throws if `beginTestTransaction`
 * hasn't been called. Used for raw Knex queries in tests.
 */
export const getCurrentDatabase = (): KnexDatabase => {
    if (!currentDatabase) {
        throw new Error(
            "No test transaction — call beginTestTransaction first",
        );
    }
    return currentDatabase;
};

/**
 * Starts a test database transaction and sets it as the current context. All
 * repository calls within `withCxIt` bodies resolve from this transaction.
 */
export const beginTestTransaction = async () => {
    setCurrentDatabase(await db.transaction());
};

/**
 * Creates a `TransactionRunner` bound to the current test transaction. Job
 * factories use this so the job's own `transaction()` calls create savepoints
 * within the outer test transaction.
 */
export const createTransactionRunner = () =>
    createKnexTransactionRunner(getCurrentDatabase(), txStore);

/**
 * Rolls back the current test transaction, discarding any changes made during
 * the test.
 */
export const rollbackTestTransaction = async () => {
    const database = currentDatabase;
    currentDatabase = undefined;
    if (database) {
        await database.rollback();
    }
};

/**
 * Creates an Express app wired with real Knex repositories and services.
 * Returns `{ app, ...repositories }`, so individual repo instances can be
 * destructured directly. Accepts overrides for repositories, middleware,
 * services, and jobs. Must be called after `beginTestTransaction`.
 */
export const createTestApp = ({
    repositories: repositoryOverrides,
    middleware,
    services,
    jobs,
}: {
    repositories?: Partial<AppRepositories>;
    middleware?: Partial<AppMiddleware>;
    services?: Partial<AppServices>;
    jobs?: Partial<AppJobs>;
}) => {
    if (!currentDatabase) {
        throw new Error(
            "No test transaction — call beginTestTransaction before createTestApp",
        );
    }

    const appRepositories = {
        ...defaultAppRepositories,
        ...repositoryOverrides,
    };

    const transaction = createKnexTransactionRunner(currentDatabase, txStore);

    const appJobs = {
        ...defaultAppJobs,
        ...jobs,
    };

    const appParams: AppParams = {
        services: {
            attachmentService: createAttachmentService(
                transaction,
                appRepositories,
            ),
            bookService: createBookService(transaction, appRepositories),
            contentExtractionService: createContentExtractionService(),
            cooklistService: createCooklistService(
                transaction,
                appRepositories,
            ),
            ingredientService: createIngredientService(
                transaction,
                appRepositories,
                appJobs,
            ),
            listService: createListService(transaction, appRepositories),
            mealService: createMealService(transaction, appRepositories),
            plannerService: createPlannerService(transaction, appRepositories),
            recipeService: createRecipeService(transaction, appRepositories),
            tagService: createTagService(transaction, appRepositories),
            userService: createUserService(
                transaction,
                appRepositories,
                appJobs,
                {
                    accessExpiration: 1000,
                    accessSecret,
                    refreshExpiration: 1000,
                    refreshSecret,
                },
            ),
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
    };

    return {
        app: setupApp(appParams),
        ...appRepositories,
    };
};

/**
 * The shape of a test's local context: the Express `app` plus the app's
 * repository instances.
 */
export type TestContext = { app: Express } & AppRepositories;

/**
 * An empty-shell context used as a zero-cost initializer for destructuring
 * `let { app, ...repos } = TestContext`. Real values are assigned in
 * `beforeEach` via `createTestApp`.
 */
export const TestContext: TestContext = {} as unknown as TestContext;
