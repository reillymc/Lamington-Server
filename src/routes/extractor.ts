import express from "express";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createExtractorRouter: CreateRouter<
    "contentExtractionService"
> = ({ contentExtractionService }) =>
    express
        .Router()
        .get<
            routes,
            paths["/extractor/recipeMetadata"]["get"]["parameters"]["path"],
            paths["/extractor/recipeMetadata"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/extractor/recipeMetadata"]["get"]["requestBody"],
            paths["/extractor/recipeMetadata"]["get"]["parameters"]["query"]
        >("/extractor/recipeMetadata", async ({ query }, res) => {
            const data = await contentExtractionService.extractRecipeMetadata(
                query.url,
            );
            return res.status(200).json(data);
        })
        .get<
            routes,
            paths["/extractor/recipe"]["get"]["parameters"]["path"],
            paths["/extractor/recipe"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/extractor/recipe"]["get"]["requestBody"],
            paths["/extractor/recipe"]["get"]["parameters"]["query"]
        >("/extractor/recipe", async ({ query }, res) => {
            const data = await contentExtractionService.extractRecipe(
                query.url,
            );
            return res.status(200).json(data);
        });
