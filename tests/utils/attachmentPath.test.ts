import { describe, it } from "node:test";
import { expect } from "expect";
import { buildAttachmentPath } from "../../src/utils/attachmentPath.ts";

describe("attachmentPath", () => {
    it("should build an unprefixed path", () => {
        expect(buildAttachmentPath("abc")).toEqual("abc");
    });

    it("should build a prefixed path", () => {
        expect(buildAttachmentPath("abc", "dev/attachments")).toEqual(
            "dev/attachments/abc",
        );
    });
});
