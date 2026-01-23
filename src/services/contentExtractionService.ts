import { load } from "cheerio";
import moment from "moment";

import type { components } from "../routes/spec/index.ts";
import { AppError } from "./logging.ts";

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
                throw new AppError({
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
                throw new AppError({
                    message: "Could not extract a name from the URL.",
                });
            }

            return { name, imageUrl };
        } catch (error) {
            throw new AppError({
                message:
                    "Failed to fetch or parse content from the provided URL.",
            });
        }
    },
    extractRecipe: async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new AppError({
                message: `Request failed with status ${response.status}`,
            });
        }
        const html = await response.text();
        const page = load(html);

        let recipeData: any = null;

        page('script[type="application/ld+json"]').each((_, element) => {
            const scriptContent = page(element).html();
            if (!scriptContent) return;

            try {
                const json = JSON.parse(scriptContent);
                // The recipe can be the main entity or part of a graph
                const graph = json["@graph"] || [json];
                const recipeNode = graph.find(
                    (node: any) =>
                        node["@type"] === "Recipe" ||
                        (Array.isArray(node["@type"]) &&
                            node["@type"].includes("Recipe")),
                );

                if (recipeNode) {
                    recipeData = recipeNode;
                    return false; // Exit the loop
                }
            } catch (e) {
                // Ignore parsing errors for invalid JSON
            }
        });

        if (!recipeData) {
            throw new AppError({
                message: "No recipe JSON-LD data found on the page.",
            });
        }

        const prepTime = moment.duration(recipeData.prepTime || 0).asMinutes();
        const cookTime = moment.duration(recipeData.cookTime || 0).asMinutes();

        return {
            name: recipeData.name || "Untitled Recipe",
            source: url,
            servings: recipeData.recipeYield,
            summary: recipeData.description,
            prepTime,
            cookTime,
            imageUrl: Array.isArray(recipeData.image)
                ? recipeData.image[0]
                : (recipeData.image?.url ?? recipeData.image),
        };
    },
});
