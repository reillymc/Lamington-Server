import sharp, { type Metadata } from "sharp";
import { UnsupportedMediaTypeError } from "./errors.ts";

export const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024;

const SUPPORTED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

export const isSupportedImageFormat = (metadata: Metadata): boolean =>
    SUPPORTED_IMAGE_FORMATS.has(metadata.format ?? "") ||
    metadata.format === "avif" ||
    (metadata.format === "heif" && metadata.compression === "av1");

export const validateRemoteImage = async (body: Buffer): Promise<Buffer> => {
    let metadata: Metadata;
    try {
        metadata = await sharp(body).metadata();
    } catch {
        throw new UnsupportedMediaTypeError("Unsupported or corrupt image");
    }

    if (!isSupportedImageFormat(metadata)) {
        throw new UnsupportedMediaTypeError("Unsupported image type");
    }

    return body;
};
