import { afterEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import { safeFetchText } from "../../src/utils/safeFetch.ts";

const mockFetch = (implementation: typeof fetch) =>
    mock.method(globalThis, "fetch", implementation);

afterEach(() => {
    mock.restoreAll();
});

const expectRejection = async (
    promise: Promise<unknown>,
    message?: string | RegExp,
) => {
    await expect(promise).rejects.toThrow(message);
};

describe("safeFetchText", () => {
    it("fetches an allowed http url", async () => {
        mockFetch(async () => new Response("hello", { status: 200 }));

        const result = await safeFetchText("http://example.com/recipe");

        expect(result).toEqual({ ok: true, status: 200, text: "hello" });
    });

    it("preserves non-ok responses", async () => {
        mockFetch(async () => new Response("nope", { status: 404 }));

        const result = await safeFetchText("https://example.com/recipe");

        expect(result).toEqual({ ok: false, status: 404, text: "nope" });
    });

    it("rejects unsupported protocols", async () => {
        await expectRejection(
            safeFetchText("ftp://example.com/recipe"),
            "Unsupported protocol",
        );
        await expectRejection(
            safeFetchText("file:///etc/passwd"),
            "Unsupported protocol",
        );
    });

    it("rejects url credentials", async () => {
        await expectRejection(
            safeFetchText("http://user:pass@example.com/recipe"),
            "credentials",
        );
    });

    it("rejects invalid urls without calling fetch", async () => {
        const fetchMock = mockFetch(async () => new Response(""));

        await expectRejection(safeFetchText("not a url"), "Invalid URL");

        expect(fetchMock.mock.callCount()).toEqual(0);
    });

    it("rejects local hostnames", async () => {
        for (const url of [
            "http://localhost/recipe",
            "http://api.localhost/recipe",
            "http://printer.local/recipe",
        ]) {
            await expectRejection(safeFetchText(url), "Disallowed host");
        }
    });

    it("rejects numeric and hex host encodings", async () => {
        for (const url of [
            "http://2130706433/recipe",
            "http://0x7f000001/recipe",
            "http://0177.0.0.1/recipe",
        ]) {
            await expectRejection(safeFetchText(url), /Disallowed address/);
        }
    });

    it("follows an allowed redirect", async () => {
        const fetchMock = mockFetch(async (input) => {
            if (String(input) === "https://example.com/recipe") {
                return new Response(null, {
                    status: 302,
                    headers: { location: "https://example.com/final" },
                });
            }
            return new Response("redirected", { status: 200 });
        });

        const result = await safeFetchText("https://example.com/recipe");

        expect(result).toEqual({
            ok: true,
            status: 200,
            text: "redirected",
        });
        expect(fetchMock.mock.callCount()).toEqual(2);
    });

    it("rejects redirect loops beyond the limit", async () => {
        const fetchMock = mockFetch(
            async () =>
                new Response(null, {
                    status: 302,
                    headers: { location: "https://example.com/again" },
                }),
        );

        await expectRejection(
            safeFetchText("https://example.com/recipe"),
            "Too many redirects",
        );
        expect(fetchMock.mock.callCount()).toEqual(4);
    });

    it("rejects oversized responses", async () => {
        mockFetch(
            async () =>
                new Response("too big", {
                    status: 200,
                    headers: { "content-length": String(6 * 1024 * 1024) },
                }),
        );

        await expectRejection(
            safeFetchText("https://example.com/recipe"),
            "size limit",
        );
    });
});
