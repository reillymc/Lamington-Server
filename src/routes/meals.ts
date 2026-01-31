import express from "express";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createMealRouter: CreateRouter<"mealService"> = ({
    mealService,
}) =>
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
