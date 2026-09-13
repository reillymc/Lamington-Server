import type { AppRepositories, Database } from "../repositories/index.ts";
import type { Logger } from "../utils/logger.ts";
import type { CreateJob } from "./job.ts";

const RETENTION_DAYS = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface CreatePurgeDeletedUsersJobParams {
    database: Database;
    repositories: Pick<
        AppRepositories,
        "userRepository" | "attachmentRepository" | "fileRepository"
    >;
    logger: Logger;
}

export const createPurgeDeletedUsersJob: CreateJob<
    CreatePurgeDeletedUsersJobParams
> = ({
    database,
    repositories: { userRepository, attachmentRepository, fileRepository },
    logger,
}) => ({
    run: async () => {
        const cutOff = new Date(Date.now() - RETENTION_DAYS * ONE_DAY_MS);

        try {
            const { users } = await userRepository.readPurgeableUsers(
                database,
                { deletedBefore: cutOff },
            );

            // Attachment rows cascade away with the user, so their URIs must
            // be collected first in order to delete the stored files.
            const { attachments } = await attachmentRepository.readAllForUsers(
                database,
                { users },
            );

            await userRepository.delete(database, { users });

            if (!attachments.length) return true;

            const results = await fileRepository.delete(undefined, attachments);

            const failed = results.filter(({ succeeded }) => !succeeded);

            if (failed.length) {
                logger.error("Failed to delete attachment files", {
                    attachments: failed,
                });
                return false;
            }

            return true;
        } catch (error) {
            logger.error("Failed to purge deleted users", error);
            return false;
        }
    },
    trigger: ["interval"],
    interval: ONE_DAY_MS,
});
