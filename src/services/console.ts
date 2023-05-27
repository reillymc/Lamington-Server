import { LamingtonConfig } from "../config";

const applyColor = ({ message, error }: { message: string; error?: boolean }): string =>
    error ? `\u001b[31m${message}\u001b[0m` : `\u001b[36m${message}\u001b[0m`;

const formatDatabaseString = (config: LamingtonConfig["database"]) => {
    let message = `Database: ${config.name} - ${config.user}@${config.host}:${
        config.port
    } (password=${!!config.password})`;
    let error = false;

    if (!config.host || !config.name || !config.user || !config.password) {
        error = true;
    }

    return { message, error };
};

const formatAuthenticationString = (config: LamingtonConfig["authentication"]) => {
    let message = `Authentication: JWT Secret=${!!config.jwtSecret}, Expiration=${config.jwtExpiration}`;
    let error = false;

    if (!config.jwtSecret || !config.jwtExpiration) {
        error = true;
    }

    return { message, error };
};

const formatAttachmentConfig = (config: LamingtonConfig["attachments"]): { message: string; error?: boolean } => {
    let message = "Attachment Storage:";
    let error = false;

    switch (config.storageService) {
        case "imgur":
            message = `${message} Imgur (Client ID: ${!!config.imgurClientId})`;
            error = !config.imgurClientId;
            break;
        case "s3":
            message = `${message} S3 (Bucket=${config.awsBucketName} - Region=${config.awsRegion}, (Path=${
                config.path
            }), Access key=${!!config.awsAccessKeyId}, Secret key=${!!config.awsSecretAccessKey})`;
            error = !config.awsBucketName || !config.awsAccessKeyId || !config.awsSecretAccessKey;
            break;
        default:
            message = `${message} Local (Path=uploads/${config.path})`;
            break;
    }

    return { message, error };
};

export const printConfig = (config: LamingtonConfig): void => {
    const database = formatDatabaseString(config.database);
    console.info(applyColor(database));

    const authentication = formatAuthenticationString(config.authentication);
    console.info(applyColor(authentication));

    const attachments = formatAttachmentConfig(config.attachments);
    console.info(applyColor(attachments));
};
