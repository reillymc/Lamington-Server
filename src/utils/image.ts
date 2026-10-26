import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";

export const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024;

const SUPPORTED_IMAGE_CONTENT_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
]);

export const isSupportedImageContentType = (
    contentType: string | null,
): boolean => {
    if (!contentType) return false;

    const [mediaType] = contentType.split(";", 1);
    return SUPPORTED_IMAGE_CONTENT_TYPES.has(
        mediaType?.trim().toLowerCase() ?? "",
    );
};

export const compressImage = (file: Buffer): Promise<Buffer> =>
    sharp(file)
        .rotate()
        .resize({
            width: 2048,
            height: 2048,
            fit: "inside",
            withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .toFormat("jpeg", { mozjpeg: true, quality: 75 })
        .keepIccProfile()
        .toBuffer();

export const computePreviewHash = async (file: Buffer) => {
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
