import type {
    ExtractedRecipeMetadata,
    NormalizedExtractedRecipe,
} from "./spec/index.ts";

export interface RecipeExtractor {
    extractRecipeMetadata(url: string): Promise<ExtractedRecipeMetadata>;
    extractRecipe(url: string): Promise<NormalizedExtractedRecipe>;
}
