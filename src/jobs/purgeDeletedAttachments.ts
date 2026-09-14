import type { AppRepositories, Database } from "../repositories/index.ts";
import type { Logger } from "../utils/logger.ts";
import type { CreateJob } from "./job.ts";

const BATCH_SIZE = 100;
const ONE_HOUR_MS = 60 * 60 * 1000;
const NEVER_LINKED_CUTOFF_MS = 24 * 60 * 60 * 1000;

interface CreatePurgeDeletedAttachmentsJobParams {
    database: Database;
    repositories: Pick<
        AppRepositories,
        "attachmentRepository" | "fileRepository"
    >;
    logger: Logger;
}

export const createPurgeDeletedAttachmentsJob: CreateJob<
    CreatePurgeDeletedAttachmentsJobParams
> = ({
    database,
    repositories: { attachmentRepository, fileRepository },
    logger,
}) => ({
    run: async () => {
        try {
            let hadFailures = false;
            const createdBefore = new Date(Date.now() - NEVER_LINKED_CUTOFF_MS);

            for (;;) {
                const { attachments } =
                    await attachmentRepository.readPurgeable(database, {
                        limit: BATCH_SIZE,
                        createdBefore,
                    });

                if (!attachments.length) break;

                const results = await fileRepository.delete(
                    undefined,
                    attachments,
                );

                const succeeded = results.filter(({ succeeded }) => succeeded);
                const failed = results.filter(({ succeeded }) => !succeeded);

                if (succeeded.length) {
                    await attachmentRepository.deletePurgeable(database, {
                        attachments: succeeded,
                    });
                }

                if (failed.length) {
                    logger.error("Failed to delete attachment files", {
                        attachments: failed,
                    });
                    hadFailures = true;
                }

                // Stop when the batch was short or nothing succeeded,
                // otherwise a batch of permanently failing deletions
                // would be re-claimed forever.
                if (attachments.length < BATCH_SIZE || !succeeded.length) {
                    break;
                }
            }

            return !hadFailures;
        } catch (error) {
            logger.error("Failed to purge deleted attachments", error);
            return false;
        }
    },
    trigger: ["interval"],
    interval: ONE_HOUR_MS,
});
