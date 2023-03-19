const config: LamingtonConfig = {
    app: {
        port: parseInt(process.env.NODE_LOCAL_PORT ?? "3000", 0),
        logDetail: "dev",
    },
    database: {
        client: "mysql2",
        name: process.env.DB_NAME ?? "",
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    },
    authentication: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiration: process.env.JWT_EXPIRATION,
    },
    service: {
        imageStorage: "s3",
        imgurClientId: process.env.IMGUR_CLIENT_ID,
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsRegion: process.env.AWS_REGION,
        awsBucketName: process.env.AWS_BUCKET_NAME,
    },
} as const;

interface LamingtonConfig {
    app: {
        port: number;
        logDetail: "tiny" | "short" | "dev";
    };
    database: {
        client: string;
        name: string;
        host: string | undefined;
        user: string | undefined;
        password: string | undefined;
    };
    authentication: {
        jwtSecret: string | undefined;
        jwtExpiration: string | undefined;
    };
    service: {
        imageStorage: "local" | "imgur" | "s3";
        imgurClientId: string | undefined;
        awsAccessKeyId: string | undefined;
        awsSecretAccessKey: string | undefined;
        awsRegion: string | undefined;
        awsBucketName: string | undefined;
    };
}

export default config;
