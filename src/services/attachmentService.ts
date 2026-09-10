import sharp from "sharp";
import type { components } from "../routes/spec/schema.js";
import {
    CreatedDataFetchError,
    createService,
    InsufficientDataError,
} from "./service.ts";

const compressImage = (file: Buffer) =>
    sharp(file)
        .toFormat("jpeg", { mozjpeg: true, quality: 60 })
        .resize({ width: 2048, height: 2048, fit: "inside" })
        .rotate()
        .withMetadata()
        .toBuffer();

export interface AttachmentService {
    create: (
        userId: string,
        file: { buffer: Buffer } | undefined,
    ) => Promise<components["schemas"]["ImageAttachment"]>;
}

export const createAttachmentService = createService<
    AttachmentService,
    "attachmentRepository" | "fileRepository"
>(({ attachmentRepository, fileRepository }) => ({
    create: async (userId, file) => {
        if (!file) {
            throw new InsufficientDataError("attachment");
        }

        const {
            attachments: [attachmentEntry],
        } = await attachmentRepository.create({
            userId,
            attachments: [{ uri: "" }],
        });

        if (!attachmentEntry) {
            throw new CreatedDataFetchError("attachment");
        }

        const compressedImage = await compressImage(file.buffer);

        const result = await fileRepository.create({
            file: compressedImage,
            userId,
            attachmentId: attachmentEntry.attachmentId,
        });

        if (!result) {
            throw new CreatedDataFetchError("attachment");
        }

        const {
            attachments: [finalAttachmentEntry],
        } = await attachmentRepository.update({
            userId,
            attachments: [
                { attachmentId: attachmentEntry.attachmentId, uri: result },
            ],
        });

        if (!finalAttachmentEntry) {
            throw new CreatedDataFetchError("attachment");
        }

        return {
            attachmentId: finalAttachmentEntry.attachmentId,
            uri: finalAttachmentEntry.uri,
        };
    },
}));
