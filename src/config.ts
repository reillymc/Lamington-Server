const parseLogLevel = (logLevel: string | undefined): "tiny" | "short" | "dev" => {
    switch (logLevel) {
        case "tiny":
            return "tiny";
        case "short":
            return "short";
        case "dev":
            return "dev";
        default:
            return "tiny";
    }
};

const parseAttachmentStorage = (imageStorage: string | undefined): "local" | "imgur" | "s3" => {
    switch (imageStorage) {
        case "local":
            return "local";
        case "imgur":
            return "imgur";
        case "s3":
            return "s3";
        default:
            return "local";
    }
};

const config: LamingtonConfig = {
    app: {
        port: parseInt(process.env.NODE_LOCAL_PORT ?? "3000", 10),
        logDetail: parseLogLevel(process.env.LOG_LEVEL),
    },
    database: {
        client: "mysql2",
        name: process.env.NODE_ENV === "test" ? process.env.DB_TEST_NAME : process.env.DB_NAME,
        host: process.env.NODE_ENV === "test" ? process.env.DB_TEST_HOST : process.env.DB_HOST,
        port: parseInt(
            (process.env.NODE_ENV === "test" ? process.env.DB_TEST_PORT : process.env.DB_PORT) ?? "3306",
            10
        ),
        user: process.env.NODE_ENV === "test" ? process.env.DB_TEST_USER : process.env.DB_USER,
        password: process.env.NODE_ENV === "test" ? process.env.DB_TEST_PASSWORD : process.env.DB_PASSWORD,
        pageSize: parseInt(process.env.DB_PAGE_SIZE ?? "10", 10),
    },
    authentication: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiration: process.env.JWT_EXPIRATION,
    },
    attachments: {
        storageService: parseAttachmentStorage(process.env.ATTACHMENT_STORAGE_SERVICE),
        imgurClientId: process.env.IMGUR_CLIENT_ID,
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsRegion: process.env.AWS_REGION,
        awsBucketName: process.env.AWS_BUCKET_NAME,
        path: process.env.ATTACHMENT_PATH ?? "prod",
    },
} as const;

export interface LamingtonConfig {
    app: {
        port: number;
        logDetail: "tiny" | "short" | "dev";
    };
    database: {
        client: "mysql2";
        host: string | undefined;
        port: number | undefined;
        name: string | undefined;
        user: string | undefined;
        password: string | undefined;
        pageSize: number | undefined;
    };
    authentication: {
        jwtSecret: string | undefined;
        jwtExpiration: string | undefined;
    };
    attachments: {
        storageService: "local" | "imgur" | "s3";
        path: string;
        imgurClientId: string | undefined;
        awsAccessKeyId: string | undefined;
        awsSecretAccessKey: string | undefined;
        awsRegion: string | undefined;
        awsBucketName: string | undefined;
    };
}

export default config;
