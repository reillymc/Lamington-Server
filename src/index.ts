import { S3Client } from "@aws-sdk/client-s3";
import { Undefined } from "@reillymc/es-utils";
import knex from "knex";
import ms, { type StringValue } from "ms";
import { createLogger, format, transports } from "winston";
import { type AppConfig, setupApp } from "./app.ts";
import development from "./database/knexfile.development.ts";
import production from "./database/knexfile.production.ts";
import { createUserStarterDataJob } from "./jobs/createUserStarterData.ts";
import { type AppJobs, runStartupJobs } from "./jobs/index.ts";
import { createRefreshIngredientsAssetJob } from "./jobs/refreshIngredientsAsset.ts";
import { createErrorHandlerMiddleware } from "./middleware/errorHandler.ts";
import { createLoggerMiddleware } from "./middleware/logger.ts";
import {
    createRateLimiterControlled,
    createRateLimiterLoose,
    createRateLimiterRestrictive,
} from "./middleware/rateLimiters.ts";
import { createValidatorMiddleware } from "./middleware/validator.ts";
import { createDiskFileRepository } from "./repositories/disk/diskFileRepository.ts";
import type { AppRepositories } from "./repositories/index.ts";
import { createKnexAttachmentRepository } from "./repositories/knex/knexAttachmentRepository.ts";
import { createKnexBookRepository } from "./repositories/knex/knexBookRepository.ts";
import { createKnexCookListRepository } from "./repositories/knex/knexCooklistRepository.ts";
import { createKnexIngredientRepository } from "./repositories/knex/knexIngredientRepository.ts";
import { createKnexListRepository } from "./repositories/knex/knexListRepository.ts";
import { createKnexMealRepository } from "./repositories/knex/knexMealRepository.ts";
import { createKnexPlannerRepository } from "./repositories/knex/knexPlannerRepository.ts";
import { createKnexRecipeRepository } from "./repositories/knex/knexRecipeRepository.ts";
import {
    createKnexTransactionRunner,
    createKnexTxStore,
} from "./repositories/knex/knexRepository.ts";
import { createKnexTagRepository } from "./repositories/knex/knexTagRepository.ts";
import { createKnexUserRepository } from "./repositories/knex/knexUserRepository.ts";
import { createS3FileRepository } from "./repositories/s3/s3FileRepository.ts";
import { createAttachmentService } from "./services/attachmentService.ts";
import { createBookService } from "./services/bookService.ts";
import { createContentExtractionService } from "./services/contentExtractionService.ts";
import { createCooklistService } from "./services/cooklistService.ts";
import { createIngredientService } from "./services/ingredientService.ts";
import { createListService } from "./services/listService.ts";
import { createMealService } from "./services/mealService.ts";
import { createPlannerService } from "./services/plannerService.ts";
import { createRecipeService } from "./services/recipeService.ts";
import { createTagService } from "./services/tagService.ts";
import { createUserService } from "./services/userService.ts";
import "winston-daily-rotate-file";
import type { AppMiddleware } from "./middleware/index.ts";
import type { AppServices } from "./services/index.ts";

const port = parseInt(process.env.PORT ?? "3000", 10);

const uploadDirectory = process.env.UPLOAD_DIRECTORY ?? "uploads";
const assetDirectory = process.env.ASSET_DIRECTORY ?? "assets";
const logDirectory = process.env.LOG_DIRECTORY ?? "logs";

const ErrorLogFileTransport = new transports.DailyRotateFile({
    level: "error",
    filename: "error-%DATE%.log",
    zippedArchive: true,
    maxSize: "10m",
    maxFiles: "60d",
    dirname: logDirectory,
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
    ),
});

const AccessLogFileTransport = new transports.DailyRotateFile({
    level: "http",
    filename: "access-%DATE%.log",
    zippedArchive: true,
    maxSize: "10m",
    maxFiles: "60d",
    dirname: logDirectory,
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.printf(({ level, message, timestamp }) => {
            return `${timestamp} ${level}: ${message}`;
        }),
    ),
});

const ConsoleLogTransport =
    process.env.NODE_ENV !== "production"
        ? new transports.Console({
              level: "http",
              format: format.combine(format.colorize(), format.simple()),
          })
        : undefined;

export const logger = createLogger({
    transports: [
        ErrorLogFileTransport,
        AccessLogFileTransport,
        ConsoleLogTransport,
    ].filter(Undefined),
});

const selectDatabaseConfig = () => {
    switch (process.env.NODE_ENV) {
        case "development":
            return development;
        default:
            return production;
    }
};

const db = knex(selectDatabaseConfig());

let fileRepository = createDiskFileRepository(
    uploadDirectory,
    process.env.ATTACHMENT_PATH ?? "prod",
);

if (process.env.ATTACHMENT_STORAGE_SERVICE === "s3") {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION;
    const awsBucketName = process.env.AWS_BUCKET_NAME;

    if (!accessKeyId || !secretAccessKey || !awsRegion || !awsBucketName) {
        logger.error(
            `Incomplete S3 details
accessKeyId: ${accessKeyId ? "provided" : "missing"},
secretAccessKey: ${secretAccessKey ? "provided" : "missing"},
awsRegion: ${awsRegion ? "provided" : "missing"},
awsBucketName: ${awsBucketName ? "provided" : "missing"}`,
        );
        throw "Error starting Lamington Server";
    }

    fileRepository = createS3FileRepository(
        new S3Client({
            region: awsRegion,
            credentials: { accessKeyId, secretAccessKey },
            useDualstackEndpoint: true,
        }),
        awsBucketName,
        process.env.ATTACHMENT_PATH ?? "prod",
    );
}

const txStore = createKnexTxStore();
const transactionRunner = createKnexTransactionRunner(db, txStore);

const repositories: AppRepositories = {
    attachmentRepository: createKnexAttachmentRepository(txStore),
    bookRepository: createKnexBookRepository(txStore),
    cooklistRepository: createKnexCookListRepository(txStore),
    fileRepository,
    ingredientRepository: createKnexIngredientRepository(txStore),
    listRepository: createKnexListRepository(txStore),
    mealRepository: createKnexMealRepository(txStore),
    plannerRepository: createKnexPlannerRepository(txStore),
    recipeRepository: createKnexRecipeRepository(txStore),
    tagRepository: createKnexTagRepository(txStore),
    userRepository: createKnexUserRepository(txStore),
};

const accessSecret = process.env.JWT_SECRET;
const accessExpiration = ms(
    (process.env.JWT_ACCESS_EXPIRATION as StringValue | undefined) ?? "15m",
);
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const refreshExpiration = ms(
    (process.env.JWT_REFRESH_EXPIRATION as StringValue | undefined) ?? "7d",
);

if (!accessSecret || !refreshSecret) {
    throw "Error starting Lamington Server";
}

const jobs: AppJobs = {
    refreshIngredientsAsset: createRefreshIngredientsAssetJob({
        transaction: transactionRunner,
        repositories,
        assetDirectory,
        logger,
    }),
    createUserStarterData: createUserStarterDataJob({
        transaction: transactionRunner,
        repositories,
        logger,
    }),
};

const services: AppServices = {
    attachmentService: createAttachmentService(transactionRunner, repositories),
    bookService: createBookService(transactionRunner, repositories),
    contentExtractionService: createContentExtractionService(),
    cooklistService: createCooklistService(transactionRunner, repositories),
    ingredientService: createIngredientService(
        transactionRunner,
        repositories,
        jobs,
    ),
    listService: createListService(transactionRunner, repositories),
    mealService: createMealService(transactionRunner, repositories),
    plannerService: createPlannerService(transactionRunner, repositories),
    recipeService: createRecipeService(transactionRunner, repositories),
    tagService: createTagService(transactionRunner, repositories),
    userService: createUserService(transactionRunner, repositories, jobs, {
        accessExpiration,
        accessSecret,
        refreshExpiration,
        refreshSecret,
    }),
};

const middleware: AppMiddleware = {
    rateLimiterControlled: createRateLimiterControlled(),
    rateLimiterLoose: createRateLimiterLoose(),
    rateLimiterRestrictive: createRateLimiterRestrictive(),
    validator: createValidatorMiddleware({ accessSecret }),
    errorHandler: createErrorHandlerMiddleware({ logger }),
    logger: createLoggerMiddleware({ logger }),
};

const config: AppConfig = {
    externalHost: process.env.EXTERNAL_HOST,
    allowedOrigin: process.env.CORS_ALLOWED_ORIGIN,
    uploadDirectory,
    assetDirectory,
};

runStartupJobs(jobs);

const app = setupApp({ services, middleware, config });

const server = app.listen(port, () => {
    logger.info(`Lamington Server Started: http://localhost:${port}`);
});

process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception, closing server:", err);
    process.exit(1);
});

process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    server.close(() => {
        process.exit(1);
    });
});
