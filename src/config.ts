const config: LamingtonConfig = {
    app: {
        port: 3000,
        logDetail: "dev",
    },
    database: {
        client: "mysql2",
        name: "lamingtondb",
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    },
    authentication: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiration: process.env.JWT_EXPIRATION,
    },
    service: {
        imageStorage: "imgur",
        imgurClientId: process.env.IMGUR_CLIENT_ID,
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
        imageStorage: "local" | "imgur";
        imgurClientId: string | undefined;
    };
}

export default config;
