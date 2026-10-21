import { afterEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import sharp, { type Metadata } from "sharp";
import {
    ExtractionLimitError,
    InvalidImageUrlError,
    UnsupportedMediaTypeError,
} from "../../src/utils/errors.ts";
import {
    isSupportedImageContentType,
    MAX_REMOTE_IMAGE_BYTES,
} from "../../src/utils/image.ts";
import {
    fetchRemoteImage,
    isSupportedImageFormat,
} from "../../src/utils/remoteImage.ts";

const mockFetch = (implementation: typeof fetch) =>
    mock.method(globalThis, "fetch", implementation);

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

const createImageResponse = async (
    format: "jpeg" | "png" | "webp" | "gif" | "avif",
) =>
    new Response(new Uint8Array(await createImage(format)), {
        status: 200,
        headers: { "content-type": `image/${format}` },
    });

afterEach(() => {
    mock.restoreAll();
});

describe("isSupportedImageContentType", () => {
    it("should accept supported image media types with parameters", () => {
        expect(isSupportedImageContentType("image/jpeg; charset=binary")).toBe(
            true,
        );
        expect(isSupportedImageContentType("IMAGE/PNG")).toBe(true);
    });

    it("should reject missing and unsupported media types", () => {
        expect(isSupportedImageContentType(null)).toBe(false);
        expect(isSupportedImageContentType("image/svg+xml")).toBe(false);
        expect(isSupportedImageContentType("text/html")).toBe(false);
    });
});

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

describe("fetchRemoteImage", () => {
    for (const format of ["jpeg", "png", "webp", "gif", "avif"] as const) {
        it(`should fetch ${format} images`, async () => {
            mockFetch(async () => createImageResponse(format));

            const result = await fetchRemoteImage(
                "https://example.com/image.jpg",
            );

            expect(result).toEqual(await createImage(format));
        });
    }

    it("should reject a non-image content type", async () => {
        mockFetch(
            async () =>
                new Response("hello", {
                    status: 200,
                    headers: { "content-type": "text/html" },
                }),
        );

        await expect(
            fetchRemoteImage("https://example.com/image.jpg"),
        ).rejects.toThrow(UnsupportedMediaTypeError);
    });

    it("should reject SVG content", async () => {
        mockFetch(
            async () =>
                new Response("<svg></svg>", {
                    status: 200,
                    headers: { "content-type": "image/svg+xml" },
                }),
        );

        await expect(
            fetchRemoteImage("https://example.com/image.svg"),
        ).rejects.toThrow(UnsupportedMediaTypeError);
    });

    it("should reject a content type that does not match the bytes", async () => {
        mockFetch(
            async () =>
                new Response("not an image", {
                    status: 200,
                    headers: { "content-type": "image/jpeg" },
                }),
        );

        await expect(
            fetchRemoteImage("https://example.com/image.jpg"),
        ).rejects.toThrow(UnsupportedMediaTypeError);
    });

    it("should reject an image with a corrupt header", async () => {
        const corrupt = Buffer.concat([
            Buffer.from("89504e470d0a1a0a", "hex"),
            Buffer.alloc(8),
        ]);

        mockFetch(
            async () =>
                new Response(corrupt, {
                    status: 200,
                    headers: { "content-type": "image/png" },
                }),
        );

        await expect(
            fetchRemoteImage("https://example.com/image.png"),
        ).rejects.toThrow(UnsupportedMediaTypeError);
    });

    it("should reject a non-successful upstream response", async () => {
        mockFetch(async () => new Response("missing", { status: 404 }));

        await expect(
            fetchRemoteImage("https://example.com/image.jpg"),
        ).rejects.toThrow(InvalidImageUrlError);
    });

    it("should reject blocked URLs without fetching", async () => {
        const fetchMock = mockFetch(
            async () => new Response(null, { status: 200 }),
        );

        await expect(
            fetchRemoteImage("http://127.0.0.1/image.jpg"),
        ).rejects.toThrow(InvalidImageUrlError);
        expect(fetchMock.mock.callCount()).toEqual(0);
    });

    it("should revalidate redirect targets", async () => {
        const fetchMock = mockFetch(
            async () =>
                new Response(null, {
                    status: 302,
                    headers: {
                        location: "http://169.254.169.254/latest/meta-data",
                    },
                }),
        );

        await expect(
            fetchRemoteImage("https://example.com/image.jpg"),
        ).rejects.toThrow(InvalidImageUrlError);
        expect(fetchMock.mock.callCount()).toEqual(1);
    });

    it("should reject an oversized image", async () => {
        mockFetch(
            async () =>
                new Response(Buffer.alloc(4), {
                    status: 200,
                    headers: {
                        "content-type": "image/jpeg",
                        "content-length": String(MAX_REMOTE_IMAGE_BYTES + 1),
                    },
                }),
        );

        await expect(
            fetchRemoteImage("https://example.com/image.jpg"),
        ).rejects.toThrow(ExtractionLimitError);
    });

    it("should wrap unexpected fetch errors", async () => {
        mockFetch(async () => {
            throw new Error("network down");
        });

        await expect(
            fetchRemoteImage("https://example.com/image.jpg"),
        ).rejects.toThrow(InvalidImageUrlError);
    });
});
