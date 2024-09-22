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
        port: parseInt(process.env.PORT ?? "3000", 10),
        logDetail: parseLogLevel(process.env.LOG_LEVEL),
        pageSize: parseInt(process.env.PAGE_SIZE ?? "50", 10),
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
        pageSize: number;
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
