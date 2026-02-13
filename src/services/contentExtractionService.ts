import { load } from "cheerio";
import moment from "moment";

import type { components } from "../routes/spec/index.ts";
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
                // The recipe can be the main entity or part of a graph
                const graph = json["@graph"] || [json];

                if (!Array.isArray(graph)) {
                    return false;
                }

                const recipeNode = graph.find(
                    (node) =>
                        node["@type"] === "Recipe" ||
                        (Array.isArray(node["@type"]) &&
                            node["@type"].includes("Recipe")),
                );

                if (recipeNode) {
                    recipeData = recipeNode;
                    return false; // Exit the loop
                }
            } catch (_e) {
                // Ignore parsing errors for invalid JSON
            }
        });

        if (!recipeData) {
            throw new UnknownError({
                message: "No recipe JSON-LD data found on the page.",
            });
        }

        if (typeof recipeData !== "object") {
            throw new UnknownError({
                message: "No valid JSON-LD recipe object found on the page.",
            });
        }

        const prepTime =
            "prepTime" in recipeData && typeof recipeData.prepTime === "number"
                ? moment.duration(recipeData.prepTime).asMinutes()
                : undefined;

        const cookTime =
            "cookTime" in recipeData && typeof recipeData.cookTime === "number"
                ? moment.duration(recipeData.cookTime).asMinutes()
                : undefined;

        let imageUrl: string | undefined;
        if ("image" in recipeData && recipeData.image) {
            const imageValue = Array.isArray(recipeData.image)
                ? recipeData.image[0]
                : recipeData.image;

            if (typeof imageValue === "string") {
                imageUrl = imageValue;
            } else if (
                imageValue &&
                typeof imageValue === "object" &&
                "url" in imageValue &&
                typeof imageValue.url === "string"
            ) {
                imageUrl = imageValue.url;
            }
        }

        return {
            name:
                "name" in recipeData && typeof recipeData.name === "string"
                    ? recipeData.name
                    : "Untitled Recipe",
            source: url,
            servings:
                "recipeYield" in recipeData &&
                typeof recipeData.recipeYield === "number"
                    ? recipeData.recipeYield
                    : undefined,
            summary:
                "description" in recipeData &&
                typeof recipeData.description === "string"
                    ? recipeData.description
                    : undefined,
            prepTime,
            cookTime,
            imageUrl,
        };
    },
});
