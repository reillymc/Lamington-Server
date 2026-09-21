import { load } from "cheerio";
import type { components } from "../routes/spec/index.ts";
import { matchRecipeIngredients } from "../utils/ingredientMatcher.ts";
import { AppError } from "../utils/logger.ts";
import {
    convertRecipe,
    findRecipe,
    isRecipe,
} from "../utils/recipeConverter.ts";
import { safeFetchText } from "../utils/safeFetch.ts";
import { type CreateService, UnknownError } from "./service.ts";

export interface ContentExtractionService {
    extractRecipeMetadata: (
        url: string,
    ) => Promise<components["schemas"]["ExtractedRecipeMetadata"]>;
    extractRecipe: (
        url: string,
        userId: string,
    ) => Promise<components["schemas"]["ExtractedRecipe"]>;
}

export const createContentExtractionService: CreateService<
    ContentExtractionService,
    "ingredientRepository"
> = (database, { ingredientRepository }) => ({
    extractRecipeMetadata: async (url: string) => {
        try {
            const response = await safeFetchText(url);
            if (!response.ok) {
                throw new UnknownError({
                    message: `Request failed with status ${response.status}`,
                });
            }
            const page = load(response.text);

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
    extractRecipe: async (url: string, userId: string) => {
        try {
            let response: Awaited<ReturnType<typeof safeFetchText>>;
            response = await safeFetchText(url);

            if (!response.ok) {
                throw new UnknownError({
                    message: `Request failed with status ${response.status}`,
                });
            }
            const page = load(response.text);

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
                    message:
                        "No valid JSON-LD recipe object found on the page.",
                });
            }

            const { ingredients } = await ingredientRepository.readAll(
                database,
                { userId },
            );

            return matchRecipeIngredients(
                convertRecipe(recipeData),
                ingredients,
            );
        } catch (e) {
            if (e instanceof AppError) {
                throw e;
            }

            throw new UnknownError(e);
        }
    },
});
