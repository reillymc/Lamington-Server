import express from "express";

import type { AppDependencies } from "../appDependencies.ts";

import { RecipeEndpoint } from "./spec/index.ts";
import {
    type DeleteRecipeRequestBody,
    type DeleteRecipeRequestParams,
    type DeleteRecipeResponse,
    type GetAllRecipesRequestBody,
    type GetAllRecipesRequestParams,
    type GetAllRecipesRequestQuery,
    type GetAllRecipesResponse,
    type GetMyRecipesRequestBody,
    type GetMyRecipesRequestParams,
    type GetMyRecipesRequestQuery,
    type GetMyRecipesResponse,
    type GetRecipeRequestBody,
    type GetRecipeRequestParams,
    type GetRecipeResponse,
    type PostRecipeRatingRequestBody,
    type PostRecipeRatingRequestParams,
    type PostRecipeRatingResponse,
    type PostRecipeRequestBody,
    type PostRecipeRequestParams,
    type PostRecipeResponse,
    type PutRecipeRequestBody,
    type PutRecipeRequestParams,
    type PutRecipeResponse,
} from "./spec/recipe.ts";
import type { QueryParam } from "./spec/base.ts";
import type { ReadAllRequest } from "../repositories/recipeRepository.ts";
import { parseBaseQuery } from "./helpers/queryParams.ts";
import { Undefined } from "../utils/index.ts";

const parseRecipesQuerySort = (sort: QueryParam) => {
    if (Array.isArray(sort)) return;
    if (sort === undefined) return;

    switch (sort) {
        case "name":
            return "name";
        case "ratingPersonal":
            return "ratingPersonal";
        case "ratingAverage":
            return "ratingAverage";
        case "cookTime":
            return "cookTime";
    }
};

// TODO: move validation to middleware via zod
export const parseRecipeQuery = ({
    sort: rawSort,
    ingredients: rawIngredients,
    order: rawOrder,
    page: rawPage,
    search: rawSearch,
    tags: rawTags,
}: GetAllRecipesRequestQuery): Omit<ReadAllRequest, "userId"> => {
    const { page, search, order } = parseBaseQuery({ page: rawPage, search: rawSearch, order: rawOrder });
    const sort = parseRecipesQuerySort(rawSort);

    const ingredients = (Array.isArray(rawIngredients) ? rawIngredients : [rawIngredients])
        .filter(Undefined)
        .map(ingredientId => ({ ingredientId }));
    const tags = (Array.isArray(rawTags) ? rawTags : [rawTags]).filter(Undefined).map(tagId => ({ tagId }));

    return { page, sort, order, filter: { name: search, tags, ingredients } };
};

export const createRecipeRouter = ({ recipeService }: AppDependencies["services"]) => {
    const router = express.Router();

    /**
     * GET request to fetch all recipes
     */
    router.get<GetAllRecipesRequestParams, GetAllRecipesResponse, GetAllRecipesRequestBody, GetAllRecipesRequestQuery>(
        RecipeEndpoint.getAllRecipes,
        async ({ query, session }, res) => {
            const options = parseRecipeQuery(query);
            const { recipes: data, nextPage } = await recipeService.getAll(session.userId, options);
            return res.status(200).json({ error: false, data, page: options.page, nextPage });
        }
    );

    /**
     * GET request to fetch all recipes by a user
     */
    router.get<GetMyRecipesRequestParams, GetMyRecipesResponse, GetMyRecipesRequestBody, GetMyRecipesRequestQuery>(
        RecipeEndpoint.getMyRecipes,
        async ({ query, session }, res) => {
            const options = parseRecipeQuery(query);
            const { recipes: data, nextPage } = await recipeService.getAll(session.userId, {
                ...options,
                filter: { ...options.filter, owner: session.userId },
            });
            return res.status(200).json({ error: false, data, page: options.page, nextPage });
        }
    );

    /**
     * GET request to fetch a recipe by Id
     * Requires recipe query params
     */
    router.get<GetRecipeRequestParams, GetRecipeResponse, GetRecipeRequestBody>(
        RecipeEndpoint.getRecipe,
        async ({ params, session }, res) => {
            const data = await recipeService.get(session.userId, params);
            return res.status(200).json({ error: false, data });
        }
    );

    /**
     * DELETE request to delete a recipe
     * Requires recipe delete body
     */
    router.delete<DeleteRecipeRequestParams, DeleteRecipeResponse, DeleteRecipeRequestBody>(
        RecipeEndpoint.deleteRecipe,
        async ({ session, params }, res) => {
            await recipeService.delete(session.userId, params);
            return res.status(204).json({ error: false });
        }
    );

    /**
     * POST request to create a new recipe or update an existing recipe
     * Requires recipe data body
     */
    router.post<PostRecipeRequestParams, PostRecipeResponse, PostRecipeRequestBody>(
        RecipeEndpoint.postRecipe,
        async ({ body, session }, res) => {
            const data = await recipeService.create(session.userId, body.data);
            return res.status(201).json({ error: false, data });
        }
    );

    /**
     * PUT request to update a recipe.
     */
    router.put<PutRecipeRequestParams, PutRecipeResponse, PutRecipeRequestBody>(
        RecipeEndpoint.putRecipe,
        async ({ body, session }, res) => {
            const data = await recipeService.update(session.userId, body.data);
            return res.status(200).json({ error: false, data });
        }
    );

    /**
     * POST request to rate a recipe
     * Requires recipe rating body
     */
    router.post<PostRecipeRatingRequestParams, PostRecipeRatingResponse, PostRecipeRatingRequestBody>(
        RecipeEndpoint.postRecipeRating,
        async ({ body, session, params }, res) => {
            const data = await recipeService.saveRating(session.userId, { ...params, ...body });
            return res.status(201).json({ error: false, data });
        }
    );

    return router;
};
