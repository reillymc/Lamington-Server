import { EnsureArray } from "@reillymc/es-utils";
import express from "express";
import { getSession } from "../middleware/session.ts";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createCooklistRouter: CreateRouter<"cooklistService"> = ({
    cooklistService,
}) =>
    express
        .Router()
        .get<
            routes,
            paths["/cooklist/meals"]["get"]["parameters"]["path"],
            paths["/cooklist/meals"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/cooklist/meals"]["get"]["requestBody"],
            paths["/cooklist/meals"]["get"]["parameters"]["query"]
        >("/cooklist/meals", async (_req, res) => {
            const data = await cooklistService.getMeals(getSession().userId);
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/cooklist/meals"]["post"]["parameters"]["path"],
            paths["/cooklist/meals"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/cooklist/meals"]["post"]["requestBody"]["content"]["application/json"],
            paths["/cooklist/meals"]["post"]["parameters"]["query"]
        >("/cooklist/meals", async ({ body }, res) => {
            const data = await cooklistService.createMeals(
                getSession().userId,
                EnsureArray(body),
            );
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/cooklist/meals/{mealId}"]["patch"]["parameters"]["path"],
            paths["/cooklist/meals/{mealId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/cooklist/meals/{mealId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/cooklist/meals/{mealId}"]["patch"]["parameters"]["query"]
        >("/cooklist/meals/:mealId", async ({ params, body }, res) => {
            const data = await cooklistService.updateMeal(
                getSession().userId,
                params.mealId,
                body,
            );
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/cooklist/meals/{mealId}"]["delete"]["parameters"]["path"],
            paths["/cooklist/meals/{mealId}"]["delete"]["responses"]["204"]["content"],
            paths["/cooklist/meals/{mealId}"]["delete"]["requestBody"],
            paths["/cooklist/meals/{mealId}"]["delete"]["parameters"]["query"]
        >("/cooklist/meals/:mealId", async ({ params }, res) => {
            await cooklistService.deleteMeal(
                getSession().userId,
                params.mealId,
            );
            return res.status(204).send();
        });
