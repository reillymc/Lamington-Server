import express from "express";

import type { AppDependencies } from "../appDependencies.ts";

import { BookEndpoint } from "./spec/index.ts";
import {
    type DeleteBookMemberRequestBody,
    type DeleteBookMemberRequestParams,
    type DeleteBookMemberResponse,
    type DeleteBookRecipeRequestBody,
    type DeleteBookRecipeRequestParams,
    type DeleteBookRecipeResponse,
    type DeleteBookRequestBody,
    type DeleteBookRequestParams,
    type DeleteBookResponse,
    type GetBookRecipesRequestBody,
    type GetBookRecipesRequestParams,
    type GetBookRecipesRequestQuery,
    type GetBookRecipesResponse,
    type GetBookRequestBody,
    type GetBookRequestParams,
    type GetBookResponse,
    type GetBooksRequestBody,
    type GetBooksRequestParams,
    type GetBooksResponse,
    type PostBookMemberRequestBody,
    type PostBookMemberRequestParams,
    type PostBookMemberResponse,
    type PostBookRecipeRequestBody,
    type PostBookRecipeRequestParams,
    type PostBookRecipeResponse,
    type PostBookRequestBody,
    type PostBookRequestParams,
    type PostBookResponse,
    type PutBookRequestBody,
    type PutBookRequestParams,
} from "./spec/book.ts";
import { parseBaseQuery } from "./helpers/queryParams.ts";

export const createBookRouter = ({ bookService }: AppDependencies["services"]) => {
    const router = express.Router();

    /**
     * GET request to fetch all books for a user
     */
    router.get<GetBooksRequestParams, GetBooksResponse, GetBooksRequestBody>(
        BookEndpoint.getBooks,
        async ({ session }, res) => {
            const result = await bookService.getAll(session.userId);
            return res.status(200).json({ error: false, data: result });
        }
    );

    /**
     * GET request to fetch a book
     */
    router.get<GetBookRequestParams, GetBookResponse, GetBookRequestBody>(
        BookEndpoint.getBook,
        async ({ params, session }, res) => {
            const result = await bookService.get(session.userId, params);
            return res.status(200).json({ error: false, data: result });
        }
    );

    /**
     * POST request to create a book.
     */
    router.post<PostBookRequestParams, PostBookResponse, PostBookRequestBody>(
        BookEndpoint.postBook,
        async ({ body, session }, res) => {
            const result = await bookService.create(session.userId, body.data);
            return res.status(201).json({ error: false, data: result });
        }
    );

    /**
     * PUT request to update a book.
     */
    router.put<PutBookRequestParams, PostBookResponse, PutBookRequestBody>(
        BookEndpoint.putBook,
        async ({ body, session }, res) => {
            const result = await bookService.update(session.userId, body.data);
            return res.status(200).json({ error: false, data: result });
        }
    );

    /**
     * DELETE request to delete a book.
     */
    router.delete<DeleteBookRequestParams, DeleteBookResponse, DeleteBookRequestBody>(
        BookEndpoint.deleteBook,
        async ({ params, session }, res) => {
            await bookService.delete(session.userId, params);
            return res.status(204).json({ error: false });
        }
    );

    /**
     * GET request to fetch all recipes for a book
     */
    router.get<
        GetBookRecipesRequestParams,
        GetBookRecipesResponse,
        GetBookRecipesRequestBody,
        GetBookRecipesRequestQuery
    >(BookEndpoint.getBookRecipes, async ({ params, session, query }, res) => {
        const parsedQuery = parseBaseQuery(query);
        const result = await bookService.readRecipes(session.userId, {
            ...params,
            filter: { name: parsedQuery.search },
            page: parsedQuery.page,
            order: parsedQuery.order,
        });
        return res.status(200).json({ error: false, data: result.recipes, nextPage: result.nextPage });
    });

    /**
     * POST request to save a book recipe.
     */
    router.post<PostBookRecipeRequestParams, PostBookRecipeResponse, PostBookRecipeRequestBody>(
        BookEndpoint.postBookRecipe,
        async ({ body, params, session }, res) => {
            const result = await bookService.addRecipe(session.userId, { ...params, ...body });
            return res.status(201).json({ error: false, data: result });
        }
    );

    /**
     * POST request to update a book member.
     */
    router.post<PostBookMemberRequestParams, PostBookMemberResponse, PostBookMemberRequestBody>(
        BookEndpoint.postBookMember,
        async ({ params, session }, res) => {
            const result = await bookService.joinMembership(session.userId, params);
            return res.status(201).json({ error: false, data: result });
        }
    );

    /**
     * DELETE request to delete a book recipe.
     */
    router.delete<DeleteBookRecipeRequestParams, DeleteBookRecipeResponse, DeleteBookRecipeRequestBody>(
        BookEndpoint.deleteBookRecipe,
        async ({ params, session }, res) => {
            await bookService.removeRecipe(session.userId, params);
            return res.status(204).json({ error: false });
        }
    );

    /**
     * DELETE request to delete a book member.
     */
    router.delete<DeleteBookMemberRequestParams, DeleteBookMemberResponse, DeleteBookMemberRequestBody>(
        BookEndpoint.deleteBookMember,
        async ({ params, session }, res) => {
            await bookService.leaveMembership(session.userId, params);
            return res.status(204).json({ error: false });
        }
    );

    return router;
};
