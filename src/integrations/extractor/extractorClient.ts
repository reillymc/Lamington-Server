import type { AppError } from "../../utils/errors.ts";
import {
    InvalidImageUrlError,
    PayloadTooLargeError,
    UnsupportedMediaTypeError,
} from "../../utils/errors.ts";
import {
    ResponseTooLargeError,
    readCappedBody,
    readCappedText,
} from "../../utils/readCappedResponse.ts";
import { MAX_REMOTE_IMAGE_BYTES } from "../../utils/remoteImage.ts";
import {
    ExtractorFailureError,
    ExtractorRecipeError,
    ExtractorRequestError,
    ExtractorUnavailableError,
} from "./errors.ts";
import type {
    ExtractedRecipeMetadata,
    NormalizedExtractedRecipe,
} from "./spec/index.ts";
import {
    validateNormalizedRecipe,
    validateRecipeMetadata,
} from "./spec/validation.ts";
import type { ExtractorClient, FetchedImage } from "./types.ts";

const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const MAX_ERROR_BODY_BYTES = 1024 * 1024;
const EXTRACTOR_TIMEOUT_MS = 12_000;

type HttpExtractorClientConfig = {
    baseUrl: string | undefined;
    apiKey?: string;
};

const parseJson = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new ExtractorFailureError(
            "Recipe extractor returned invalid JSON",
            error,
        );
    }
};

const getSidecarMessage = (body: unknown): string | undefined =>
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
        ? body.message
        : undefined;

const mapSidecarError = (status: number, body: unknown): AppError => {
    const message = getSidecarMessage(body);

    switch (status) {
        case 400:
            return new ExtractorRequestError(message);
        case 413:
        case 422:
            return new ExtractorRecipeError(message);
        case 415:
            return new UnsupportedMediaTypeError(message);
        case 401:
        case 429:
        case 503:
        case 504:
            return new ExtractorUnavailableError(message);
        default:
            return new ExtractorFailureError(message);
    }
};

const mapImageError = (status: number, message?: string): AppError => {
    switch (status) {
        case 400:
            return new InvalidImageUrlError(message);
        case 413:
            return new PayloadTooLargeError(message);
        case 415:
            return new UnsupportedMediaTypeError(message);
        case 502:
            return new InvalidImageUrlError(message);
        case 401:
        case 429:
        case 503:
        case 504:
            return new ExtractorUnavailableError(message);
        default:
            return new ExtractorFailureError(message);
    }
};

const isTimeoutError = (error: unknown): boolean =>
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError");

const readSidecarErrorMessage = async (
    response: Response,
): Promise<string | undefined> => {
    try {
        const text = await readCappedText(response, MAX_ERROR_BODY_BYTES);
        return getSidecarMessage(parseJson(text));
    } catch {
        return undefined;
    }
};

export const createHttpExtractorClient = ({
    baseUrl,
    apiKey,
}: HttpExtractorClientConfig): ExtractorClient => {
    if (process.env.NODE_ENV === "production" && baseUrl && !apiKey) {
        throw new Error(
            "EXTRACTOR_API_KEY is required when EXTRACTOR_URL is configured in production",
        );
    }

    const send = async (
        path: string,
        url: string,
        accept: string,
    ): Promise<Response> => {
        if (!baseUrl) {
            throw new ExtractorUnavailableError(
                "Recipe extractor is not configured",
            );
        }

        const endpoint = `${baseUrl.replace(/\/+$/, "")}${path}`;
        const headers: Record<string, string> = {
            accept,
            "content-type": "application/json",
        };
        if (apiKey) {
            headers.authorization = `Bearer ${apiKey}`;
        }

        try {
            return await fetch(endpoint, {
                method: "POST",
                redirect: "error",
                signal: AbortSignal.timeout(EXTRACTOR_TIMEOUT_MS),
                headers,
                body: JSON.stringify({ url }),
            });
        } catch (error) {
            throw new ExtractorUnavailableError(
                isTimeoutError(error)
                    ? "Recipe extractor timed out"
                    : undefined,
                error,
            );
        }
    };

    const request = async <T>(
        path: string,
        url: string,
        validate: (value: unknown) => value is T,
    ): Promise<T> => {
        const response = await send(path, url, "application/json");

        let text: string;
        try {
            text = await readCappedText(response, MAX_RESPONSE_BYTES);
        } catch (error) {
            if (error instanceof ResponseTooLargeError) {
                throw new ExtractorFailureError(
                    "Recipe extractor response exceeded the size limit",
                    error,
                );
            }

            throw new ExtractorUnavailableError(
                isTimeoutError(error)
                    ? "Recipe extractor timed out"
                    : undefined,
                error,
            );
        }

        if (response.status === 401 || response.status === 429) {
            throw mapSidecarError(response.status, undefined);
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("application/json")) {
            throw new ExtractorFailureError(
                "Recipe extractor returned a non-JSON response",
            );
        }

        const body = parseJson(text);

        if (!response.ok) {
            throw mapSidecarError(response.status, body);
        }

        if (!validate(body)) {
            throw new ExtractorFailureError(
                "Recipe extractor response failed contract validation",
            );
        }

        return body;
    };

    const fetchImage = async (url: string): Promise<FetchedImage> => {
        const response = await send("/v1/image", url, "image/*");

        if (!response.ok) {
            const message = await readSidecarErrorMessage(response);
            throw mapImageError(response.status, message);
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().startsWith("image/")) {
            await response.body?.cancel().catch(() => undefined);
            throw new UnsupportedMediaTypeError(
                "Recipe extractor returned a non-image response",
            );
        }

        let body: Buffer;
        try {
            body = await readCappedBody(response, MAX_REMOTE_IMAGE_BYTES);
        } catch (error) {
            if (error instanceof ResponseTooLargeError) {
                throw new PayloadTooLargeError("Image exceeds the 5MB limit");
            }

            throw new ExtractorUnavailableError(
                isTimeoutError(error)
                    ? "Recipe extractor timed out"
                    : undefined,
                error,
            );
        }

        return { body, contentType };
    };

    return {
        extractRecipeMetadata: (
            url: string,
        ): Promise<ExtractedRecipeMetadata> =>
            request("/v1/recipeMetadata", url, validateRecipeMetadata),
        extractRecipe: (url: string): Promise<NormalizedExtractedRecipe> =>
            request("/v1/recipe", url, validateNormalizedRecipe),
        fetchImage,
    };
};
