import type { components } from "./spec/index.ts";

export type FetchedImage = {
    body: Buffer;
    contentType: string;
};

export interface RecipeExtractor {
    extractRecipeMetadata(
        url: string,
    ): Promise<components["schemas"]["ExtractedRecipeMetadata"]>;
    extractRecipe(
        url: string,
    ): Promise<components["schemas"]["ExtractedRecipe"]>;
}

export interface ImageFetcher {
    fetchImage(url: string): Promise<FetchedImage>;
}

export interface ExtractorClient extends RecipeExtractor, ImageFetcher {}
