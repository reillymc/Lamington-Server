import type { components } from "../routes/spec/schema.js";
import { compressImage, computePreviewHash } from "../utils/image.ts";
import {
    CreatedDataFetchError,
    type CreateService,
    InsufficientDataError,
} from "./service.ts";

export interface AttachmentService {
    create: (
        userId: string,
        file: { buffer: Buffer } | undefined,
    ) => Promise<components["schemas"]["ImageAttachment"]>;
}

export const createAttachmentService: CreateService<
    AttachmentService,
    "attachmentRepository" | "fileRepository"
> = (database, { attachmentRepository, fileRepository }) => ({
    create: async (userId, file) => {
        if (!file) {
            throw new InsufficientDataError("attachment");
        }

        let attachmentId: string | undefined;

        try {
            const [compressedImage, previewHash] = await Promise.all([
                compressImage(file.buffer),
                computePreviewHash(file.buffer).catch(() => undefined),
            ]);

            return await database.transaction(async (trx) => {
                const {
                    attachments: [attachmentEntry],
                } = await attachmentRepository.create(trx, {
                    userId,
                    attachments: [{ preview: previewHash }],
                });

                if (!attachmentEntry) {
                    throw new CreatedDataFetchError("attachment");
                }

                attachmentId = attachmentEntry.attachmentId;

                const [createdFile] = await fileRepository.create(undefined, {
                    attachmentId,
                    file: compressedImage,
                });

                if (!createdFile?.succeeded) {
                    throw new CreatedDataFetchError("attachment");
                }

                return { attachmentId, preview: attachmentEntry.preview };
            });
        } catch (error) {
            // If attachment row rolled back with the transaction, delete file
            if (attachmentId) {
                const attachmentExists = await attachmentRepository
                    .verifyPermissions(database, {
                        userId,
                        attachments: [{ attachmentId }],
                    })
                    .then(
                        ({ attachments: [permission] }) =>
                            permission?.hasPermissions === true,
                    )
                    .catch(() => false);

                if (!attachmentExists) {
                    await fileRepository
                        .delete(undefined, { attachmentId })
                        .catch(() => undefined);
                }
            }
            throw error;
        }
    },
});
