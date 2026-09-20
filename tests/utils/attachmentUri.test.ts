import { describe, it } from "node:test";
import { expect } from "expect";
import {
    createPopulateAttachmentUri,
    createS3AttachmentUri,
    defaultAttachmentUri,
} from "../../src/utils/attachmentUri.ts";

describe("attachmentUri", () => {
    it("should resolve a relative local path by default", () => {
        expect(defaultAttachmentUri("abc")).toEqual(
            "/v1/attachments/image/abc",
        );
    });

    it("should resolve an s3 public url without a key prefix", () => {
        const attachmentUri = createS3AttachmentUri("https://cdn.example.com");

        expect(attachmentUri("abc")).toEqual("https://cdn.example.com/abc");
    });

    it("should apply a key prefix to the s3 public url", () => {
        const attachmentUri = createS3AttachmentUri(
            "https://cdn.example.com",
            "dev/attachments",
        );

        expect(attachmentUri("abc")).toEqual(
            "https://cdn.example.com/dev/attachments/abc",
        );
    });

    it("should populate the heroImage uri", () => {
        const populateAttachmentUri =
            createPopulateAttachmentUri(defaultAttachmentUri);

        expect(
            populateAttachmentUri(
                {
                    mealId: "meal-1",
                    heroImage: { attachmentId: "abc", preview: "hash" },
                },
                "heroImage",
            ),
        ).toEqual({
            mealId: "meal-1",
            heroImage: {
                attachmentId: "abc",
                preview: "hash",
                uri: "/v1/attachments/image/abc",
            },
        });
    });

    it("should preserve a missing heroImage", () => {
        const populateAttachmentUri =
            createPopulateAttachmentUri(defaultAttachmentUri);

        expect(
            populateAttachmentUri(
                { mealId: "meal-1", heroImage: undefined },
                "heroImage",
            ),
        ).toEqual({ mealId: "meal-1" });
    });

    it("should preserve a null heroImage", () => {
        const populateAttachmentUri =
            createPopulateAttachmentUri(defaultAttachmentUri);

        expect(
            populateAttachmentUri(
                { mealId: "meal-1", heroImage: null },
                "heroImage",
            ),
        ).toEqual({ mealId: "meal-1", heroImage: null });
    });

    it("should populate a bare attachment when no key is given", () => {
        const populateAttachmentUri =
            createPopulateAttachmentUri(defaultAttachmentUri);

        expect(
            populateAttachmentUri({ attachmentId: "abc", preview: "hash" }),
        ).toEqual({
            attachmentId: "abc",
            preview: "hash",
            uri: "/v1/attachments/image/abc",
        });
    });
});
