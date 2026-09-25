import { afterEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import { ExtractionLimitError } from "../../src/utils/errors.ts";
import {
    createSafeFetchText,
    createSafeLookup,
    isPublicAddress,
    safeFetchText,
} from "../../src/utils/safeFetch.ts";

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

describe("isPublicAddress", () => {
    it("should reject benchmark and private addresses", () => {
        expect(isPublicAddress("198.18.0.1")).toBe(false);
        expect(isPublicAddress("198.19.255.255")).toBe(false);
        expect(isPublicAddress("10.0.0.1")).toBe(false);
        expect(isPublicAddress("::ffff:198.18.0.1")).toBe(false);
    });

    it("should allow public addresses", () => {
        expect(isPublicAddress("8.8.8.8")).toBe(true);
        expect(isPublicAddress("2001:4860:4860::8888")).toBe(true);
    });
});

describe("createSafeLookup", () => {
    it("should reject a mixed public and private DNS answer", async () => {
        const lookup = createSafeLookup((_hostname, _options, callback) => {
            callback(null, [
                { address: "8.8.8.8", family: 4 },
                { address: "127.0.0.1", family: 4 },
            ]);
        });

        const result = new Promise<unknown>((resolve, reject) => {
            lookup("example.com", {}, (error, address) => {
                if (error) reject(error);
                else resolve(address);
            });
        });

        await expect(result).rejects.toThrow("Disallowed host");
    });

    it("should return all public DNS answers when requested", async () => {
        const addresses = [
            { address: "8.8.8.8", family: 4 },
            { address: "2001:4860:4860::8888", family: 6 },
        ];
        const lookup = createSafeLookup((_hostname, _options, callback) => {
            callback(null, addresses);
        });

        const result = new Promise<unknown>((resolve, reject) => {
            lookup("example.com", { all: true }, (error, address) => {
                if (error) reject(error);
                else resolve(address);
            });
        });

        await expect(result).resolves.toEqual(addresses);
    });
});

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

    it("rejects IPv6 literals and trailing-dot local hostnames", async () => {
        for (const url of [
            "http://[::1]/recipe",
            "http://[2001:db8::1]/recipe",
            "http://localhost./recipe",
        ]) {
            await expectRejection(
                safeFetchText(url),
                /Disallowed (address|host)/,
            );
        }
    });

    it("revalidates redirect targets before fetching them", async () => {
        const fetchMock = mockFetch(
            async () =>
                new Response(null, {
                    status: 302,
                    headers: { location: "http://127.0.0.1/private" },
                }),
        );

        await expectRejection(
            safeFetchText("https://example.com/recipe"),
            /Disallowed address/,
        );
        expect(fetchMock.mock.callCount()).toEqual(1);
    });

    it("uses the hardened dispatcher for the default fetch", async () => {
        mockFetch(async (_input, init) => {
            expect(
                (init as RequestInit & { dispatcher?: unknown }).dispatcher,
            ).toBeDefined();
            return new Response("dispatched");
        });

        const result = await safeFetchText("https://example.com/recipe");

        expect(result.text).toBe("dispatched");
    });

    it("supports an injected fetch implementation", async () => {
        const fetchImplementation = async () => new Response("injected");
        const fetchText = createSafeFetchText(fetchImplementation);

        const result = await fetchText("https://example.com/recipe");

        expect(result).toEqual({ ok: true, status: 200, text: "injected" });
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

        await expect(
            safeFetchText("https://example.com/recipe"),
        ).rejects.toThrow(ExtractionLimitError);
    });
});
