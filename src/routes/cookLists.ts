import express from "express";

import type { AppDependencies } from "../appDependencies.ts";
import { EnsureArray } from "../utils/index.ts";
import type { paths, routes } from "./spec/index.ts";

export const createCooklistRouter = ({ cooklistService }: AppDependencies["services"]) =>
    express
        .Router()
        .get<
            routes,
            paths["/cooklist/meals"]["get"]["parameters"]["path"],
            paths["/cooklist/meals"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/cooklist/meals"]["get"]["requestBody"],
            paths["/cooklist/meals"]["get"]["parameters"]["query"]
        >("/cooklist/meals", async ({ session }, res) => {
            const data = await cooklistService.getMeals(session.userId);
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/cooklist/meals"]["post"]["parameters"]["path"],
            paths["/cooklist/meals"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/cooklist/meals"]["post"]["requestBody"]["content"]["application/json"],
            paths["/cooklist/meals"]["post"]["parameters"]["query"]
        >("/cooklist/meals", async ({ body, session }, res) => {
            const data = await cooklistService.createMeals(session.userId, EnsureArray(body));
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/cooklist/meals/{mealId}"]["patch"]["parameters"]["path"],
            paths["/cooklist/meals/{mealId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/cooklist/meals/{mealId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/cooklist/meals/{mealId}"]["patch"]["parameters"]["query"]
        >("/cooklist/meals/:mealId", async ({ params, body, session }, res) => {
            const data = await cooklistService.updateMeal(session.userId, params.mealId, body);
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/cooklist/meals/{mealId}"]["delete"]["parameters"]["path"],
            paths["/cooklist/meals/{mealId}"]["delete"]["responses"]["204"]["content"],
            paths["/cooklist/meals/{mealId}"]["delete"]["requestBody"],
            paths["/cooklist/meals/{mealId}"]["delete"]["parameters"]["query"]
        >("/cooklist/meals/:mealId", async ({ params, session }, res) => {
            await cooklistService.deleteMeal(session.userId, params.mealId);
            return res.status(204).send();
        });
