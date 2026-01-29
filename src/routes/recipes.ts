import express from "express";
import type { CreateRoute } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createRecipeRouter: CreateRoute<"recipeService"> = ({
    recipeService,
}) =>
    express
        .Router()
        .get<
            routes,
            paths["/recipes"]["get"]["parameters"]["path"],
            paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/recipes"]["get"]["requestBody"],
            paths["/recipes"]["get"]["parameters"]["query"]
        >("/recipes", async ({ query, session }, res) => {
            const data = await recipeService.getAll(
                session.userId,
                query?.page,
                query?.search,
                query?.sort,
                query?.order,
                query?.owner,
                query?.tags,
            );
            return res.status(200).json(data);
        })
        .get<
            routes,
            paths["/recipes/{recipeId}"]["get"]["parameters"]["path"],
            paths["/recipes/{recipeId}"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/recipes/{recipeId}"]["get"]["requestBody"],
            paths["/recipes/{recipeId}"]["get"]["parameters"]["query"]
        >("/recipes/:recipeId", async ({ params, session }, res) => {
            const data = await recipeService.get(
                session.userId,
                params.recipeId,
            );
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/recipes/{recipeId}"]["delete"]["parameters"]["path"],
            paths["/recipes/{recipeId}"]["delete"]["responses"]["204"]["content"],
            paths["/recipes/{recipeId}"]["delete"]["requestBody"],
            paths["/recipes/{recipeId}"]["delete"]["parameters"]["query"]
        >("/recipes/:recipeId", async ({ session, params }, res) => {
            await recipeService.delete(session.userId, params.recipeId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/recipes"]["post"]["parameters"]["path"],
            paths["/recipes"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/recipes"]["post"]["requestBody"]["content"]["application/json"],
            paths["/recipes"]["post"]["parameters"]["query"]
        >("/recipes", async ({ body, session }, res) => {
            const data = await recipeService.create(session.userId, body);
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/recipes/{recipeId}"]["patch"]["parameters"]["path"],
            paths["/recipes/{recipeId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/recipes/{recipeId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/recipes/{recipeId}"]["patch"]["parameters"]["query"]
        >("/recipes/:recipeId", async ({ body, session, params }, res) => {
            const data = await recipeService.update(
                session.userId,
                params.recipeId,
                body,
            );
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/recipes/{recipeId}/rating"]["post"]["parameters"]["path"],
            paths["/recipes/{recipeId}/rating"]["post"]["responses"]["200"]["content"]["application/json"],
            paths["/recipes/{recipeId}/rating"]["post"]["requestBody"]["content"]["application/json"],
            paths["/recipes/{recipeId}/rating"]["post"]["parameters"]["query"]
        >(
            "/recipes/:recipeId/rating",
            async ({ body, session, params }, res) => {
                const data = await recipeService.saveRating(
                    session.userId,
                    params.recipeId,
                    body.rating,
                );
                return res.status(200).json(data);
            },
        );
