import type { AppRepositories, Database } from "../repositories/index.ts";
import type { Logger } from "../utils/logger.ts";
import type { CreateJob } from "./job.ts";

const RETENTION_DAYS = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 100;

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
        let hadFailures = false;
        const cutOff = new Date(Date.now() - RETENTION_DAYS * ONE_DAY_MS);

        try {
            for (;;) {
                const { users, attachments } = await database.transaction(
                    async (trx) => {
                        const { users } =
                            await userRepository.readPurgeableUsers(trx, {
                                deletedBefore: cutOff,
                                limit: BATCH_SIZE,
                            });

                        if (!users.length) {
                            return { users, attachments: [] };
                        }

                        // Attachment rows cascade away with the user, so their
                        // ids must be collected first in order to delete files.
                        const { attachments } =
                            await attachmentRepository.readAllForUsers(trx, {
                                users,
                            });

                        await userRepository.delete(trx, { users });

                        return { users, attachments };
                    },
                );

                if (!users.length) break;

                if (attachments.length) {
                    const results = await fileRepository.delete(
                        undefined,
                        attachments,
                    );

                    const failed = results.filter(
                        ({ succeeded }) => !succeeded,
                    );

                    if (failed.length) {
                        logger.error("Failed to delete attachment files", {
                            attachments: failed,
                        });
                        hadFailures = true;
                    }
                }

                if (users.length < BATCH_SIZE) break;
            }

            return !hadFailures;
        } catch (error) {
            logger.error("Failed to purge deleted users", error);
            return false;
        }
    },
    trigger: ["interval"],
    interval: ONE_DAY_MS,
});
