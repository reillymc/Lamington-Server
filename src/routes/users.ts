import express from "express";
import { getSession } from "../middleware/session.ts";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createUserRouter: CreateRouter<"userService"> = ({
    userService,
}) =>
    express
        .Router()
        .get<
            routes,
            paths["/users"]["get"]["parameters"]["path"],
            paths["/users"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/users"]["get"]["requestBody"],
            paths["/users"]["get"]["parameters"]["query"]
        >("/users", async ({ query }, res) => {
            const data = await userService.getAll(
                getSession().userId,
                query?.status,
            );
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/users/{userId}/approve"]["post"]["parameters"]["path"],
            paths["/users/{userId}/approve"]["post"]["responses"]["204"]["content"],
            paths["/users/{userId}/approve"]["post"]["requestBody"],
            paths["/users/{userId}/approve"]["post"]["parameters"]["query"]
        >("/users/:userId/approve", async ({ params }, res) => {
            await userService.approve(getSession().userId, params.userId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/users/{userId}/blacklist"]["post"]["parameters"]["path"],
            paths["/users/{userId}/blacklist"]["post"]["responses"]["204"]["content"],
            paths["/users/{userId}/blacklist"]["post"]["requestBody"],
            paths["/users/{userId}/blacklist"]["post"]["parameters"]["query"]
        >("/users/:userId/blacklist", async ({ params }, res) => {
            await userService.blacklist(getSession().userId, params.userId);
            return res.status(204).send();
        })
        .delete<
            routes,
            paths["/users/{userId}"]["delete"]["parameters"]["path"],
            paths["/users/{userId}"]["delete"]["responses"]["204"]["content"],
            paths["/users/{userId}"]["delete"]["requestBody"],
            paths["/users/{userId}"]["delete"]["parameters"]["query"]
        >("/users/:userId", async ({ params }, res) => {
            await userService.delete(getSession().userId, params.userId);
            return res.status(204).send();
        });
