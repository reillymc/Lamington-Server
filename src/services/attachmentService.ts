import type { ReadResponse } from "../repositories/fileRepository.ts";
import type { components } from "../routes/spec/schema.js";
import type { PopulateAttachmentUri } from "../utils/attachmentUri.ts";
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
    read: (attachmentId: string) => Promise<ReadResponse>;
}

export const createAttachmentService: CreateService<
    AttachmentService,
    "attachmentRepository" | "fileRepository",
    never,
    { populateAttachmentUri: PopulateAttachmentUri }
> = (
    database,
    { attachmentRepository, fileRepository },
    { populateAttachmentUri },
) => ({
    create: async (userId, file) => {
        if (!file) {
            throw new InsufficientDataError("attachment");
        }

        const [compressedImage, previewHash] = await Promise.all([
            compressImage(file.buffer),
            computePreviewHash(file.buffer).catch(() => undefined),
        ]);

        const {
            attachments: [attachmentEntry],
        } = await attachmentRepository.create(database, {
            userId,
            attachments: [{ preview: previewHash }],
        });

        if (!attachmentEntry) {
            throw new CreatedDataFetchError("attachment");
        }

        const attachmentId = attachmentEntry.attachmentId;

        try {
            const [createdFile] = await fileRepository.create(undefined, {
                attachmentId,
                file: compressedImage,
            });

            if (!createdFile?.succeeded) {
                throw new CreatedDataFetchError("attachment");
            }

            return populateAttachmentUri({
                attachmentId,
                preview: attachmentEntry.preview,
            });
        } catch (error) {
            await attachmentRepository.deletePurgeable(database, {
                attachments: [{ attachmentId }],
            });

            await fileRepository
                .delete(undefined, { attachmentId })
                .catch(() => undefined);
            throw error;
        }
    },
    read: (attachmentId) => fileRepository.read(undefined, { attachmentId }),
});
