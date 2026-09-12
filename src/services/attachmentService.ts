import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";
import type { components } from "../routes/spec/schema.js";
import {
    CreatedDataFetchError,
    type CreateService,
    InsufficientDataError,
} from "./service.ts";

const compressImage = (file: Buffer) =>
    sharp(file)
        .rotate()
        .resize({
            width: 1600,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .toFormat("jpeg", { mozjpeg: true, quality: 75 })
        .keepIccProfile()
        .toBuffer();

const computePreviewHash = async (file: Buffer) => {
    const { data, info } = await sharp(file)
        .rotate()
        .resize({
            width: 100,
            height: 100,
            fit: "inside",
            withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    return Buffer.from(rgbaToThumbHash(info.width, info.height, data)).toString(
        "base64",
    );
};

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

            const [compressedImage, previewHash] = await Promise.all([
                compressImage(file.buffer),
                computePreviewHash(file.buffer).catch(() => undefined),
            ]);

            const result = await fileRepository.create(undefined, {
                file: compressedImage,
                userId,
                attachmentId: attachmentEntry.attachmentId,
            });

            if (!result) {
                throw new CreatedDataFetchError("attachment");
            }

            const {
                attachments: [finalAttachmentEntry],
            } = await attachmentRepository.update(trx, {
                userId,
                attachments: [
                    {
                        attachmentId: attachmentEntry.attachmentId,
                        uri: result,
                        preview: previewHash,
                    },
                ],
            });

            if (!finalAttachmentEntry) {
                throw new CreatedDataFetchError("attachment");
            }

            return {
                attachmentId: finalAttachmentEntry.attachmentId,
                uri: finalAttachmentEntry.uri,
                preview: finalAttachmentEntry.preview ?? undefined,
            };
        });
    },
});
