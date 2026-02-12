import { S3Client } from "@aws-sdk/client-s3";
import { setupApp } from "./app.ts";
import config from "./config.ts";
import db from "./database/index.ts";
import { createDiskFileRepository } from "./repositories/disk/diskFileRepository.ts";
import { createS3FileRepository } from "./repositories/s3/s3FileRepository.ts";
import { logger, printConfig } from "./services/index.ts";

const port = parseInt(process.env.PORT ?? "3000", 10);

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

const app = setupApp({
    database: db,
    repositories: { fileRepository },
    config: {
        ...config,
        uploadDirectory: "uploads",
    },
});

const server = app.listen(port, () => {
    printConfig(config);
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
