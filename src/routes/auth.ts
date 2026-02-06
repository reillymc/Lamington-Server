import express from "express";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createAuthRouter: CreateRouter<
    "userService",
    "rateLimiterRestrictive"
> = ({ userService }, { rateLimiterRestrictive }) =>
    express
        .Router()
        .post<
            routes,
            paths["/auth/register"]["post"]["parameters"]["path"],
            paths["/auth/register"]["post"]["responses"]["200"]["content"]["application/json"],
            paths["/auth/register"]["post"]["requestBody"]["content"]["application/json"],
            paths["/auth/register"]["post"]["parameters"]["query"]
        >(
            "/auth/register",
            ...rateLimiterRestrictive,
            async ({ body }, res) => {
                const response = await userService.register(body);
                return res.status(200).json(response);
            },
        )
        .post<
            routes,
            paths["/auth/login"]["post"]["parameters"]["path"],
            paths["/auth/login"]["post"]["responses"]["200"]["content"]["application/json"],
            paths["/auth/login"]["post"]["requestBody"]["content"]["application/json"],
            paths["/auth/login"]["post"]["parameters"]["query"]
        >("/auth/login", ...rateLimiterRestrictive, async ({ body }, res) => {
            const response = await userService.login(body);
            return res.status(200).json(response);
        })
        .post(
            "/auth/refresh",
            ...rateLimiterRestrictive,
            async ({ body }, res) => {
                const response = await userService.refresh(body.refreshToken);
                return res.status(200).json(response);
            },
        );
