import express from "express";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createAuthRouter: CreateRouter<
    "authenticationService",
    "rateLimiterRestrictive"
> = ({ authenticationService }, { rateLimiterRestrictive }) =>
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
                const response = await authenticationService.register(body);
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
            const response = await authenticationService.login(body);
            return res.status(200).json(response);
        })
        .post("/auth/refresh", async ({ body }, res) => {
            const response = await authenticationService.refresh(
                body.refreshToken,
            );
            return res.status(200).json(response);
        });
