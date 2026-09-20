import { mock } from "node:test";
import { EnsureArray } from "@reillymc/es-utils";
import { createPurgeDeletedAttachmentsJob } from "../../src/jobs/purgeDeletedAttachments.ts";
import { mapInBatches } from "../../src/repositories/common/mapInBatches.ts";
import type {
    DeleteRequest,
    FileRepository,
} from "../../src/repositories/fileRepository.ts";
import type { Database } from "../../src/repositories/index.ts";
import { KnexAttachmentRepository } from "../../src/repositories/knex/knexAttachmentRepository.ts";
import { silentLogger } from "./setup.ts";

/**
 * Creates a `FileRepository` that records every file deletion without
 * touching storage, for injection via `createTestApp({ repositories })`.
 */
export const createSpyingFileRepository = (deleteResult = true) => {
    const deleteFile = mock.fn<
        (db: undefined, request: DeleteRequest) => Promise<boolean>
    >(async () => deleteResult);

    const fileRepository: FileRepository = {
        create: (_, request) =>
            mapInBatches(
                async ({ attachmentId }) => ({ attachmentId, succeeded: true }),
                EnsureArray(request),
            ),
        delete: (_, request) =>
            mapInBatches(
                async ({ attachmentId }) => ({
                    attachmentId,
                    succeeded: await deleteFile(undefined, {
                        attachmentId,
                    }).catch(() => false),
                }),
                EnsureArray(request),
            ),
    };

    return { fileRepository, deleteFile };
};

/**
 * Runs the `purgeDeletedAttachments` job against the given database and
 * file repository, so route/repository tests can observe file deletion.
 */
export const purgeDeletedAttachments = (
    database: Database,
    fileRepository: FileRepository,
) =>
    createPurgeDeletedAttachmentsJob({
        database,
        repositories: {
            attachmentRepository: KnexAttachmentRepository,
            fileRepository,
        },
        logger: silentLogger,
    }).run();
