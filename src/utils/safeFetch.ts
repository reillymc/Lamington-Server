import { isIP } from "node:net";

/**
 * Moderately hardened fetch for user-supplied URLs (recipe extraction).
 * In future a worker / sideband service should be considered for best isolation.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;
const USER_AGENT = "LamingtonRecipeExtractor/1.0";

const isLocalHostname = (hostname: string): boolean => {
    const lower = hostname.toLowerCase();
    return (
        lower === "localhost" ||
        lower.endsWith(".localhost") ||
        lower.endsWith(".local")
    );
};

const assertSafeTarget = (url: URL): void => {
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
        throw new Error(`Unsupported protocol: ${url.protocol}`);
    }

    if (url.username || url.password) {
        throw new Error("URL credentials are not allowed");
    }

    // The WHATWG URL parser normalises numeric/hex/octal hosts to dotted
    // decimals, so `isIP` covers those encodings here.
    const hostname = url.hostname.replace(/^\[|\]$/g, "");

    if (isLocalHostname(hostname)) {
        throw new Error(`Disallowed host: ${hostname}`);
    }

    if (isIP(hostname) !== 0) {
        throw new Error(`Disallowed address: ${hostname}`);
    }
};

type SafeFetchResult = {
    ok: boolean;
    status: number;
    text: string;
};

const readCappedText = async (response: Response): Promise<string> => {
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > DEFAULT_MAX_BYTES) {
        throw new Error("Response exceeds size limit");
    }

    if (!response.body) return "";

    const reader = response.body.getReader();
    const chunks: Array<Uint8Array> = [];
    let total = 0;

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
            total += value.byteLength;
            if (total > DEFAULT_MAX_BYTES) {
                await reader.cancel();
                throw new Error("Response exceeds size limit");
            }
            chunks.push(value);
        }
    }

    return Buffer.concat(chunks).toString("utf8");
};

export const safeFetchText = async (
    input: string,
): Promise<SafeFetchResult> => {
    let current: URL;
    try {
        current = new URL(input);
    } catch {
        throw new Error("Invalid URL");
    }

    const signal = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);

    for (let redirectCount = 0; ; redirectCount += 1) {
        assertSafeTarget(current);

        const response = await fetch(current, {
            redirect: "manual",
            signal,
            headers: { "user-agent": USER_AGENT },
        });

        if (REDIRECT_STATUSES.has(response.status)) {
            if (redirectCount >= DEFAULT_MAX_REDIRECTS) {
                throw new Error("Too many redirects");
            }

            const location = response.headers.get("location");
            if (!location) {
                throw new Error("Redirect missing Location header");
            }

            try {
                current = new URL(location, current);
            } catch {
                throw new Error("Invalid redirect location");
            }
            continue;
        }

        const text = await readCappedText(response);
        return { ok: response.ok, status: response.status, text };
    }
};
