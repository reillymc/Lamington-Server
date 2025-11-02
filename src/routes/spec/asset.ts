import type { BaseRequest, BaseResponse } from "./base.ts";

export const assetEndpoint = "/assets" as const;
export const assetsDirectory = "assets" as const;

export const ingredientsSubpath = "ingredients.json" as const;

export type PresetIngredients = string[];

export type GetPresetIngredientsRequest = BaseRequest;
export type GetPresetIngredientsResponse = BaseResponse<PresetIngredients>;
export type GetPresetIngredientsService = (request: GetPresetIngredientsRequest) => GetPresetIngredientsResponse;

export interface AssetServices {
    getPresetIngredients: GetPresetIngredientsService;
}
