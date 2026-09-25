import { describe, it } from "node:test";
import { expect } from "expect";
import {
    buildAttachmentDirectory,
    buildAttachmentPath,
} from "../../src/utils/attachmentPath.ts";

describe("attachmentPath", () => {
    it("should build an unprefixed path", () => {
        expect(buildAttachmentPath("abc")).toEqual("abc");
    });

    it("should build a prefixed path", () => {
        expect(buildAttachmentPath("abc", "dev/attachments")).toEqual(
            "dev/attachments/abc",
        );
    });

    it("should build an unprefixed directory", () => {
        expect(buildAttachmentDirectory("uploads")).toEqual("uploads");
    });

    it("should build a prefixed directory", () => {
        expect(buildAttachmentDirectory("uploads", "dev/attachments")).toEqual(
            "uploads/dev/attachments",
        );
    });
});
