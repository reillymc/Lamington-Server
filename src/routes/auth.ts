import express from "express";
import { validationMiddleware } from "../middleware/validator.ts";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createAuthRouter: CreateRouter<"userService"> = ({
    userService,
}) =>
    express
        .Router()
        .post<
            routes,
            paths["/auth/register"]["post"]["parameters"]["path"],
            paths["/auth/register"]["post"]["responses"]["200"]["content"]["application/json"],
            paths["/auth/register"]["post"]["requestBody"]["content"]["application/json"],
            paths["/auth/register"]["post"]["parameters"]["query"]
        >("/auth/register", ...validationMiddleware, async ({ body }, res) => {
            const response = await userService.register(body);
            return res.status(200).json(response);
        })
        .post<
            routes,
            paths["/auth/login"]["post"]["parameters"]["path"],
            paths["/auth/login"]["post"]["responses"]["200"]["content"]["application/json"],
            paths["/auth/login"]["post"]["requestBody"]["content"]["application/json"],
            paths["/auth/login"]["post"]["parameters"]["query"]
        >("/auth/login", ...validationMiddleware, async ({ body }, res) => {
            const response = await userService.login(body);
            return res.status(200).json(response);
        });
