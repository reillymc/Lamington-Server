import type {
    ExtractedRecipeMetadata,
    NormalizedExtractedRecipe,
} from "./spec/index.ts";

export type FetchedImage = {
    body: Buffer;
    contentType: string;
};

export interface RecipeExtractor {
    extractRecipeMetadata(url: string): Promise<ExtractedRecipeMetadata>;
    extractRecipe(url: string): Promise<NormalizedExtractedRecipe>;
}

export interface ImageFetcher {
    fetchImage(url: string): Promise<FetchedImage>;
}

export interface ExtractorClient extends RecipeExtractor, ImageFetcher {}
