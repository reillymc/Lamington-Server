import express from "express";
import type { CreateRoute } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createProfileRouter: CreateRoute<"userService"> = ({
    userService,
}) =>
    express
        .Router()
        .get<
            routes,
            paths["/profile"]["get"]["parameters"]["path"],
            paths["/profile"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/profile"]["get"]["requestBody"],
            paths["/profile"]["get"]["parameters"]["query"]
        >("/profile", async ({ session }, res) => {
            const data = await userService.getProfile(session.userId);
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/profile"]["delete"]["parameters"]["path"],
            paths["/profile"]["delete"]["responses"]["204"]["content"],
            paths["/profile"]["delete"]["requestBody"],
            paths["/profile"]["delete"]["parameters"]["query"]
        >("/profile", async ({ session }, res) => {
            await userService.deleteProfile(session.userId);
            return res.status(204).send();
        });
