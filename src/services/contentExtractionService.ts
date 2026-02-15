import { load } from "cheerio";
import type { components } from "../routes/spec/index.ts";
import {
    convertRecipe,
    findRecipe,
    isRecipe,
} from "../utils/recipeConverter.ts";
import { UnknownError } from "./service.ts";

export interface ContentExtractionService {
    extractRecipeMetadata: (
        url: string,
    ) => Promise<components["schemas"]["ExtractedRecipeMetadata"]>;
    extractRecipe: (
        url: string,
    ) => Promise<components["schemas"]["ExtractedRecipe"]>;
}

export const createContentExtractionService = (): ContentExtractionService => ({
    extractRecipeMetadata: async (url: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new UnknownError({
                    message: `Request failed with status ${response.status}`,
                });
            }
            const html = await response.text();
            const page = load(html);

            const name =
                page('meta[property="og:title"]').attr("content") ??
                page("title").text();
            const imageUrl = page('meta[property="og:image"]').attr("content");

            if (!name) {
                throw new UnknownError({
                    message: "Could not extract a name from the URL.",
                });
            }

            return { name, imageUrl };
        } catch (_error) {
            throw new UnknownError({
                message:
                    "Failed to fetch or parse content from the provided URL.",
            });
        }
    },
    extractRecipe: async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new UnknownError({
                message: `Request failed with status ${response.status}`,
            });
        }
        const html = await response.text();
        const page = load(html);

        let recipeData: unknown = null;

        page('script[type="application/ld+json"]').each((_, element) => {
            const scriptContent = page(element).html();
            if (!scriptContent) return;

            try {
                const json = JSON.parse(scriptContent);
                const recipe = findRecipe(json);
                if (recipe) {
                    recipeData = recipe;
                    return false;
                }
            } catch (_e) {
                // Ignore parsing errors for invalid JSON
            }
        });

        if (!isRecipe(recipeData)) {
            throw new UnknownError({
                message: "No valid JSON-LD recipe object found on the page.",
            });
        }

        try {
            return convertRecipe(recipeData);
        } catch (e) {
            throw new UnknownError(e);
        }
    },
});
