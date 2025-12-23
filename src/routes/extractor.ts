import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import type { AppDependencies } from "../appDependencies.ts";
import {
    type GetExtractRecipeMetadataRequest,
    GetExtractRecipeMetadataRequestQuery,
    type GetExtractRecipeMetadataResponse,
    type GetExtractRecipeRequest,
    GetExtractRecipeRequestQuery,
    type GetExtractRecipeResponse,
} from "./spec/extractor.ts";
import { ExtractorEndpoint } from "./spec/index.ts";
import { validateRequest } from "./helpers/validator.ts";

export const createExtractorRouter = ({ contentExtractionService }: AppDependencies["services"]) => {
    const router = express.Router();

    /**
     * GET request to extract a recipe's metadata.
     */
    router.get<GetExtractRecipeMetadataRequest, GetExtractRecipeMetadataResponse>(
        ExtractorEndpoint.getExtractRecipeMetadata,
        async (req, res) => {
            const { query } = validateRequest(req, { query: GetExtractRecipeMetadataRequestQuery });
            const data = await contentExtractionService.extractRecipeMetadata(query.url);
            return res.status(200).json({ error: false, data });
        }
    );

    /**
     * GET request to extract a full recipe from a URL.
     */
    router.get<GetExtractRecipeRequest, GetExtractRecipeResponse>(
        ExtractorEndpoint.getExtractRecipe,
        async (req, res) => {
            const { query } = validateRequest(req, { query: GetExtractRecipeRequestQuery });
            const data = await contentExtractionService.extractRecipe(query.url);
            return res.status(200).json({ error: false, data });
        }
    );

    return router;
};
