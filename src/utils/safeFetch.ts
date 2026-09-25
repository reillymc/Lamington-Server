import {
    lookup as dnsLookup,
    type LookupAddress,
    type LookupAllOptions,
} from "node:dns";
import { isIP, type LookupFunction } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent, type Dispatcher } from "undici";
import { ExtractionLimitError } from "./errors.ts";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;
const USER_AGENT = "LamingtonRecipeExtractor/1.0";

const BLOCKED_IPV4_RANGES = ["198.18.0.0/15"].map(
    (range) => ipaddr.parseCIDR(range) as [ipaddr.IPv4, number],
);

const BLOCKED_IPV6_RANGES = [
    "2001:2::/48",
    "2001:10::/28",
    "2001:20::/28",
    "2001:db8::/32",
    "3fff::/20",
    "5f00::/16",
].map((range) => ipaddr.parseCIDR(range) as [ipaddr.IPv6, number]);

const isBlockedIpv6Address = (address: ipaddr.IPv6): boolean =>
    BLOCKED_IPV6_RANGES.some(([network, prefixLength]) =>
        address.match(network, prefixLength),
    );

const isBlockedIpv4Address = (address: ipaddr.IPv4): boolean =>
    BLOCKED_IPV4_RANGES.some(([network, prefixLength]) =>
        address.match(network, prefixLength),
    );

export const isPublicAddress = (address: string): boolean => {
    try {
        const parsed = ipaddr.parse(address);

        if (parsed.kind() === "ipv4") {
            const ipv4 = parsed as ipaddr.IPv4;
            return ipv4.range() === "unicast" && !isBlockedIpv4Address(ipv4);
        }

        const ipv6 = parsed as ipaddr.IPv6;
        if (ipv6.isIPv4MappedAddress()) {
            return isPublicAddress(ipv6.toIPv4Address().toString());
        }

        return ipv6.range() === "unicast" && !isBlockedIpv6Address(ipv6);
    } catch {
        return false;
    }
};

const isLocalHostname = (hostname: string): boolean => {
    const lower = hostname.toLowerCase().replace(/\.+$/, "");
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

    const hostname = url.hostname.replace(/^\[|\]$/g, "");

    if (isLocalHostname(hostname)) {
        throw new Error(`Disallowed host: ${hostname}`);
    }

    if (isIP(hostname) !== 0) {
        throw new Error(`Disallowed address: ${hostname}`);
    }
};

type DnsResolver = (
    hostname: string,
    options: LookupAllOptions,
    callback: (
        error: NodeJS.ErrnoException | null,
        addresses: LookupAddress[],
    ) => void,
) => void;

export const createSafeLookup =
    (resolver: DnsResolver = dnsLookup): LookupFunction =>
    (hostname, options, callback) => {
        const lookupOptions: LookupAllOptions = {
            ...options,
            all: true,
            verbatim: true,
        };

        resolver(hostname, lookupOptions, (error, addresses) => {
            if (error) {
                callback(error, "", 0);
                return;
            }

            if (
                addresses.length === 0 ||
                addresses.some(({ address }) => !isPublicAddress(address))
            ) {
                callback(new Error(`Disallowed host: ${hostname}`), "", 0);
                return;
            }

            if (options.all) {
                callback(null, addresses);
                return;
            }

            const [address] = addresses;
            if (!address) {
                callback(
                    new Error(`Unable to resolve host: ${hostname}`),
                    "",
                    0,
                );
                return;
            }

            callback(null, address.address, address.family);
        });
    };

const safeDispatcher = new Agent({
    connect: {
        lookup: createSafeLookup(),
    },
});

type FetchImplementation = (
    input: RequestInfo | URL,
    init: RequestInit & { dispatcher: Dispatcher },
) => Promise<Response>;

const defaultFetch: FetchImplementation = (input, init) =>
    fetch(input, init as RequestInit) as Promise<Response>;

type SafeFetchResult = {
    ok: boolean;
    status: number;
    text: string;
};

const readCappedText = async (response: Response): Promise<string> => {
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > DEFAULT_MAX_BYTES) {
        throw new ExtractionLimitError("Response exceeds size limit");
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
                throw new ExtractionLimitError("Response exceeds size limit");
            }
            chunks.push(value);
        }
    }

    return Buffer.concat(chunks).toString("utf8");
};

export const createSafeFetchText = (
    fetchImplementation: FetchImplementation = defaultFetch,
    dispatcher: Dispatcher = safeDispatcher,
) => {
    return async (input: string): Promise<SafeFetchResult> => {
        let current: URL;
        try {
            current = new URL(input);
        } catch {
            throw new Error("Invalid URL");
        }

        const signal = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);

        for (let redirectCount = 0; ; redirectCount += 1) {
            assertSafeTarget(current);

            const response = await fetchImplementation(current, {
                redirect: "manual",
                signal,
                headers: { "user-agent": USER_AGENT },
                dispatcher,
            });

            if (REDIRECT_STATUSES.has(response.status)) {
                await response.body?.cancel().catch(() => undefined);

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
};

export const safeFetchText = createSafeFetchText();
