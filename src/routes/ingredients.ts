import express from "express";

import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createIngredientRouter: CreateRouter<"ingredientService"> = ({
    ingredientService,
}) =>
    express
        .Router()
        .get<
            routes,
            paths["/ingredients"]["get"]["parameters"]["path"],
            paths["/ingredients"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/ingredients"]["get"]["requestBody"],
            paths["/ingredients"]["get"]["parameters"]["query"]
        >("/ingredients", async ({ session }, res) => {
            const data = await ingredientService.getAll(session.userId);
            return res.status(200).json(data);
        });
