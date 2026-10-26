import sharp, { type Metadata } from "sharp";
import { InvalidImageUrlError, UnsupportedMediaTypeError } from "./errors.ts";
import {
    isSupportedImageContentType,
    MAX_REMOTE_IMAGE_BYTES,
} from "./image.ts";
import { AppError } from "./logger.ts";
import { safeFetchBuffer } from "./safeFetch.ts";

const SUPPORTED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

export const isSupportedImageFormat = (metadata: Metadata): boolean =>
    SUPPORTED_IMAGE_FORMATS.has(metadata.format ?? "") ||
    metadata.format === "avif" ||
    (metadata.format === "heif" && metadata.compression === "av1");

export const fetchRemoteImage = async (url: string): Promise<Buffer> => {
    try {
        const { body } = await safeFetchBuffer(url, {
            maxBytes: MAX_REMOTE_IMAGE_BYTES,
            validateResponse: (response) => {
                if (!response.ok) {
                    throw new InvalidImageUrlError(
                        `Image request failed with status ${response.status}`,
                    );
                }

                if (
                    !isSupportedImageContentType(
                        response.headers.get("content-type"),
                    )
                ) {
                    throw new UnsupportedMediaTypeError(
                        "Unsupported image content type",
                    );
                }
            },
        });

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
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw new InvalidImageUrlError(undefined, error);
    }
};
