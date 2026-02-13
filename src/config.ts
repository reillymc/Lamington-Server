const parseLogLevel = (
    logLevel: string | undefined,
): "tiny" | "short" | "dev" => {
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

const config: LamingtonConfig = {
    app: {
        logDetail: parseLogLevel(process.env.LOG_LEVEL),
        externalHost: process.env.EXTERNAL_HOST,
        allowedOrigin: process.env.CORS_ALLOWED_ORIGIN,
    },
    uploadDirectory: "uploads",
} as const;

export type LamingtonConfig = {
    app: {
        logDetail: "tiny" | "short" | "dev";
        externalHost: string | undefined;
        allowedOrigin: string | undefined;
    };

    uploadDirectory: string;
};

export default config;
