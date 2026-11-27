import { describe, it } from "node:test";
import { expect } from "expect";
import sharp, { type Metadata } from "sharp";
import { UnsupportedMediaTypeError } from "../../src/utils/errors.ts";
import {
    isSupportedImageFormat,
    validateRemoteImage,
} from "../../src/utils/remoteImage.ts";

const createImage = (format: "jpeg" | "png" | "webp" | "gif" | "avif") =>
    sharp({
        create: {
            width: 2,
            height: 2,
            channels: 3,
            background: "#ffffff",
        },
    })
        .toFormat(format)
        .toBuffer();

describe("isSupportedImageFormat", () => {
    const metadata = (format: string, compression?: string) =>
        ({ format, compression }) as Metadata;

    it("should accept supported image formats", () => {
        for (const format of ["jpeg", "png", "webp", "gif"]) {
            expect(isSupportedImageFormat(metadata(format))).toBe(true);
        }
        expect(isSupportedImageFormat(metadata("avif", "av1"))).toBe(true);
        expect(isSupportedImageFormat(metadata("heif", "av1"))).toBe(true);
    });

    it("should reject unsupported and HEIC formats", () => {
        expect(isSupportedImageFormat(metadata("svg"))).toBe(false);
        expect(isSupportedImageFormat(metadata("heif", "hevc"))).toBe(false);
        expect(isSupportedImageFormat(metadata("tiff"))).toBe(false);
        expect(isSupportedImageFormat({} as Metadata)).toBe(false);
    });
});

describe("validateRemoteImage", () => {
    for (const format of ["jpeg", "png", "webp", "gif", "avif"] as const) {
        it(`should accept ${format} images`, async () => {
            const image = await createImage(format);

            await expect(validateRemoteImage(image)).resolves.toEqual(image);
        });
    }

    it("should reject corrupt image bytes", async () => {
        await expect(
            validateRemoteImage(Buffer.from("not an image")),
        ).rejects.toThrow(UnsupportedMediaTypeError);
    });

    it("should reject unsupported image formats", async () => {
        const svg = Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>',
        );

        await expect(validateRemoteImage(svg)).rejects.toThrow(
            UnsupportedMediaTypeError,
        );
    });
});
