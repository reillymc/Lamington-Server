import { S3Client } from "@aws-sdk/client-s3";
import knex from "knex";
import ms, { type StringValue } from "ms";
import { setupApp } from "./app.ts";
import config from "./config.ts";
import development from "./database/knexfile.development.ts";
import production from "./database/knexfile.production.ts";
import { createErrorHandlerMiddleware } from "./middleware/errorHandler.ts";
import { createLoggerMiddleware } from "./middleware/logger.ts";
import { createNotFoundMiddleware } from "./middleware/notFound.ts";
import {
    createRateLimiterControlled,
    createRateLimiterLoose,
    createRateLimiterRestrictive,
} from "./middleware/rateLimiters.ts";
import { createValidatorMiddleware } from "./middleware/validator.ts";
import { createDiskFileRepository } from "./repositories/disk/diskFileRepository.ts";
import type { AppRepositories, Database } from "./repositories/index.ts";
import type { KnexDatabase } from "./repositories/knex/knex.ts";
import { KnexAttachmentRepository } from "./repositories/knex/knexAttachmentRepository.ts";
import { KnexBookRepository } from "./repositories/knex/knexBookRepository.ts";
import { KnexCookListRepository } from "./repositories/knex/knexCooklistRepository.ts";
import { KnexListRepository } from "./repositories/knex/knexListRepository.ts";
import { KnexMealRepository } from "./repositories/knex/knexMealRepository.ts";
import { KnexPlannerRepository } from "./repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "./repositories/knex/knexRecipeRepository.ts";
import { KnexTagRepository } from "./repositories/knex/knexTagRepository.ts";
import { KnexUserRepository } from "./repositories/knex/knexUserRepository.ts";
import { createS3FileRepository } from "./repositories/s3/s3FileRepository.ts";
import { createAttachmentService } from "./services/attachmentService.ts";
import { createBookService } from "./services/bookService.ts";
import { createContentExtractionService } from "./services/contentExtractionService.ts";
import { createCooklistService } from "./services/cooklistService.ts";
import { logger } from "./services/index.ts";
import { createListService } from "./services/listService.ts";
import { createMealService } from "./services/mealService.ts";
import { createPlannerService } from "./services/plannerService.ts";
import { createRecipeService } from "./services/recipeService.ts";
import { createTagService } from "./services/tagService.ts";
import { createUserService } from "./services/userService.ts";

const port = parseInt(process.env.PORT ?? "3000", 10);

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
    "uploads",
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
    fileRepository,
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

const repositories = defaultAppRepositories as AppRepositories<Database>;

const app = setupApp({
    services: {
        attachmentService: createAttachmentService(db, repositories),
        bookService: createBookService(db, repositories),
        contentExtractionService: createContentExtractionService(),
        cooklistService: createCooklistService(db, repositories),
        listService: createListService(db, repositories),
        mealService: createMealService(db, repositories),
        plannerService: createPlannerService(db, repositories),
        recipeService: createRecipeService(db, repositories),
        tagService: createTagService(db, repositories),
        userService: createUserService(db, repositories, {
            accessExpiration,
            accessSecret,
            refreshExpiration,
            refreshSecret,
        }),
    },
    middleware: {
        rateLimiterControlled: createRateLimiterControlled(),
        rateLimiterLoose: createRateLimiterLoose(),
        rateLimiterRestrictive: createRateLimiterRestrictive(),
        validator: createValidatorMiddleware({ accessSecret }),
        errorHandler: createErrorHandlerMiddleware(),
        logger: createLoggerMiddleware(),
        notFound: createNotFoundMiddleware(),
    },
    config: {
        ...config,
        uploadDirectory: "uploads",
    },
});

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
