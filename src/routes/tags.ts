import express from "express";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createTagsRouter: CreateRouter<"tagService"> = ({ tagService }) =>
    express
        .Router()
        .get<
            routes,
            paths["/tags"]["get"]["parameters"]["path"],
            paths["/tags"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/tags"]["get"]["requestBody"],
            paths["/tags"]["get"]["parameters"]["query"]
        >("/tags", async (_req, res) => {
            const data = await tagService.getAll();
            return res.status(200).json(data);
        });
