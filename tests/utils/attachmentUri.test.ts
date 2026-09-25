import { describe, it } from "node:test";
import { expect } from "expect";
import {
    createPopulateAttachmentUri,
    createPublicAttachmentUri,
    defaultAttachmentUri,
} from "../../src/utils/attachmentUri.ts";

describe("attachmentUri", () => {
    it("should resolve a relative local path by default", () => {
        expect(defaultAttachmentUri("abc")).toEqual("/attachments/image/abc");
    });

    it("should resolve a public url", () => {
        const attachmentUri = createPublicAttachmentUri(
            "https://cdn.example.com",
        );

        expect(attachmentUri("abc")).toEqual("https://cdn.example.com/abc");
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
                uri: "/attachments/image/abc",
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
            uri: "/attachments/image/abc",
        });
    });
});
