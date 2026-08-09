import express from "express";
import { getSession } from "../middleware/session.ts";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createProfileRouter: CreateRouter<"userService"> = ({
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
        >("/profile", async (_req, res) => {
            const data = await userService.getProfile(getSession().userId);
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/profile"]["delete"]["parameters"]["path"],
            paths["/profile"]["delete"]["responses"]["204"]["content"],
            paths["/profile"]["delete"]["requestBody"],
            paths["/profile"]["delete"]["parameters"]["query"]
        >("/profile", async (_req, res) => {
            await userService.deleteProfile(getSession().userId);
            return res.status(204).send();
        });
