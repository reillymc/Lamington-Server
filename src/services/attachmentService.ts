import sharp from "sharp";
import config from "../config.ts";
import type { Attachment } from "../database/definitions/attachment.ts";
import { CreatedDataFetchError, InsufficientDataError } from "./logging.ts";
import type { CreateService } from "./service.ts";

export const compressImage = (file: Buffer) =>
    sharp(file)
        .toFormat("jpeg", { mozjpeg: true, quality: 60 })
        .resize({ width: 2048, height: 2048, fit: "inside" })
        .rotate()
        .withMetadata()
        .toBuffer();

export const constructAttachmentPath = (
    userId: string,
    attachmentId: string,
) => {
    const uploadPath = `${config.attachments.path}/${userId}/${attachmentId}`;
    const uri = `${config.attachments.storageService}:${uploadPath}`;
    return { uri, uploadPath };
};

export interface StorageService {
    put: (buffer: Buffer, path: string) => Promise<boolean>;
}

export interface AttachmentService {
    create: (
        userId: string,
        file: { buffer: Buffer } | undefined,
    ) => Promise<Attachment>;
}

export const createAttachmentService: CreateService<
    AttachmentService,
    "attachmentRepository" | "fileRepository"
> = (database, { attachmentRepository, fileRepository }) => ({
    create: async (userId, file) => {
        if (!file) {
            throw new InsufficientDataError("attachment");
        }

        return database.transaction(async (trx) => {
            const {
                attachments: [attachmentEntry],
            } = await attachmentRepository.create(trx, {
                userId,
                attachments: [{ uri: "" }],
            });

            if (!attachmentEntry) {
                throw new CreatedDataFetchError("attachment");
            }

            const { uri, uploadPath } = constructAttachmentPath(
                userId,
                attachmentEntry.attachmentId,
            );

            const compressedImage = await compressImage(file.buffer);

            const result = await fileRepository.create(undefined, {
                file: compressedImage,
                path: uploadPath,
            });

            if (!result) {
                throw new CreatedDataFetchError("attachment");
            }

            const {
                attachments: [finalAttachmentEntry],
            } = await attachmentRepository.update(trx, {
                userId,
                attachments: [
                    { attachmentId: attachmentEntry.attachmentId, uri },
                ],
            });

            if (!finalAttachmentEntry) {
                throw new CreatedDataFetchError("attachment");
            }

            return finalAttachmentEntry;
        });
    },
});
