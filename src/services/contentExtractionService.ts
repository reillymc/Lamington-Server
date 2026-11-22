import type { components } from "../routes/spec/index.ts";
import { matchRecipeIngredients } from "../utils/ingredientMatcher.ts";
import { AppError } from "../utils/logger.ts";
import { mapTagCandidates } from "../utils/recipeTags.ts";
import type { RecipeExtractor } from "./extractor/types.ts";
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

type ContentExtractionServiceConfig = {
    extractor: RecipeExtractor;
};

export const createContentExtractionService: CreateService<
    ContentExtractionService,
    "ingredientRepository" | "tagRepository",
    never,
    ContentExtractionServiceConfig
> = (database, { ingredientRepository, tagRepository }, { extractor }) => ({
    extractRecipeMetadata: extractor.extractRecipeMetadata,
    extractRecipe: async (url: string, userId: string) => {
        try {
            const extracted = await extractor.extractRecipe(url);
            const { tagCandidates, ...recipe } = extracted;

            const tags = await tagRepository.readAll(database, undefined);
            const recipeTags = mapTagCandidates(tagCandidates, tags);

            const { ingredients } = await ingredientRepository.readAll(
                database,
                { userId },
            );

            return matchRecipeIngredients(
                recipeTags ? { ...recipe, tags: recipeTags } : recipe,
                ingredients,
            );
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new UnknownError({ innerError: error });
        }
    },
});
