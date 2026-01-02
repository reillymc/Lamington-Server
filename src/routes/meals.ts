import express from "express";

import type { paths, routes } from "./spec/index.ts";
import type { AppDependencies } from "../appDependencies.ts";

export const createMealRouter = ({ mealService }: AppDependencies["services"]) =>
    express
        .Router()
        .get<
            routes,
            paths["/meals/{mealId}"]["get"]["parameters"]["path"],
            paths["/meals/{mealId}"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/meals/{mealId}"]["get"]["requestBody"],
            paths["/meals/{mealId}"]["get"]["parameters"]["query"]
        >("/meals/:mealId", async ({ params, session }, res) => {
            const data = await mealService.get(session.userId, params.mealId);
            return res.status(200).json(data);
        });
