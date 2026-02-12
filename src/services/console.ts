import type { LamingtonConfig } from "../config.ts";

const applyColor = ({
    message,
    error,
}: {
    message: string;
    error?: boolean;
}): string =>
    error ? `\u001b[31m${message}\u001b[0m` : `\u001b[36m${message}\u001b[0m`;

const formatAuthenticationString = (
    config: LamingtonConfig["authentication"],
) => {
    const message = `Authentication: JWT Secret=${!!config.jwtSecret}, JWT Refresh Secret=${!!config.jwtRefreshSecret}`;
    let error = false;

    if (!config.jwtSecret || !config.jwtRefreshSecret) {
        error = true;
    }

    return { message, error };
};

export const printConfig = (config: LamingtonConfig): void => {
    const authentication = formatAuthenticationString(config.authentication);
    console.info(applyColor(authentication));
};
