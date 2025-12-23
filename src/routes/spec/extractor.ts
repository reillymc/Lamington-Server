import { z } from "zod";
import type { BaseRequest, BaseResponse } from "./base.ts";
import { type Recipe } from "./recipe.ts";

export const extractorEndpoint = "/extractor" as const;

export const recipePreviewsSubpath = "recipeMetadata" as const;
export const recipeDataSubpath = "recipe" as const;

type ExtractedRecipeMetadata = Pick<Recipe, "name"> & { imageUrl?: string };
type ExtractedRecipe = Omit<Recipe, "recipeId" | "public" | "timesCooked" | "owner"> & {
    name: string;
    imageUrl?: string;
};

// Get extract recipe metadata
export const GetExtractRecipeMetadataRequestQuery = z.object({
    url: z.url("A valid URL must be provided."),
});

type GetExtractRecipeMetadataRequestQuery = z.infer<typeof GetExtractRecipeMetadataRequestQuery>;

export type GetExtractRecipeMetadataRequest = BaseRequest<GetExtractRecipeMetadataRequestQuery>;
export type GetExtractRecipeMetadataResponse = BaseResponse<ExtractedRecipeMetadata>;
export type GetExtractRecipeMetadataService = (
    request: GetExtractRecipeMetadataRequest
) => GetExtractRecipeMetadataResponse;

// Get extract recipe
export const GetExtractRecipeRequestQuery = z.object({
    url: z.url("A valid URL must be provided."),
});

type GetExtractRecipeRequestQuery = z.infer<typeof GetExtractRecipeRequestQuery>;

export type GetExtractRecipeRequest = BaseRequest<GetExtractRecipeRequestQuery>;
export type GetExtractRecipeResponse = BaseResponse<ExtractedRecipe>;
export type GetExtractRecipeService = (request: GetExtractRecipeRequest) => GetExtractRecipeResponse;

export interface ExtractorApi {
    getExtractRecipeMetadata: GetExtractRecipeMetadataService;
    getExtractRecipe: GetExtractRecipeService;
}
