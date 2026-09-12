import type { AppRepositories, Database } from "../repositories/index.ts";
import type { Logger } from "../utils/logger.ts";
import type { CreateJob } from "./job.ts";

const RETENTION_DAYS = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface CreatePurgeDeletedUsersJobParams {
    database: Database;
    repositories: Pick<AppRepositories, "userRepository">;
    logger: Logger;
}

export const createPurgeDeletedUsersJob: CreateJob<
    CreatePurgeDeletedUsersJobParams
> = ({ database, repositories: { userRepository }, logger }) => ({
    run: async () => {
        const cutOff = new Date(Date.now() - RETENTION_DAYS * ONE_DAY_MS);

        try {
            const { users } = await userRepository.readPurgeableUsers(
                database,
                { updatedBefore: cutOff },
            );

            // TODO: delete stored attachment files (attachment.uri) via
            // fileRepository once orphaned-attachment cleanup lands.
            // Likely needs userId, otherwise the two userRepository
            // calls can be collapsed into one.
            await userRepository.delete(database, { users });

            return true;
        } catch (error) {
            logger.error("Failed to purge deleted users", error);
            return false;
        }
    },
    trigger: ["startup", "interval"],
    interval: ONE_DAY_MS,
});
