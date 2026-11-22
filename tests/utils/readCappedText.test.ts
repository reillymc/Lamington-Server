import { describe, it } from "node:test";
import { expect } from "expect";
import {
    ResponseTooLargeError,
    readCappedText,
} from "../../src/utils/readCappedText.ts";

describe("readCappedText", () => {
    it("returns text below the cap", async () => {
        const response = new Response("hello");

        await expect(readCappedText(response, 10)).resolves.toBe("hello");
    });

    it("returns text exactly at the cap", async () => {
        const response = new Response("0123456789", {
            headers: { "content-length": "10" },
        });

        await expect(readCappedText(response, 10)).resolves.toBe("0123456789");
    });

    it("returns an empty string for an empty body", async () => {
        const response = new Response(null);

        await expect(readCappedText(response, 10)).resolves.toBe("");
    });

    it("rejects a content-length above the cap", async () => {
        const response = new Response("small", {
            headers: { "content-length": "11" },
        });

        await expect(readCappedText(response, 10)).rejects.toThrow(
            ResponseTooLargeError,
        );
    });

    it("rejects a streamed body above the cap", async () => {
        const response = new Response(
            new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array(6));
                    controller.enqueue(new Uint8Array(6));
                    controller.close();
                },
            }),
        );

        await expect(readCappedText(response, 10)).rejects.toThrow(
            ResponseTooLargeError,
        );
    });
});
