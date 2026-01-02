import express from "express";

import type { AppDependencies } from "../appDependencies.ts";
import { EnsureArray } from "../utils/index.ts";
import type { paths, routes } from "./spec/index.ts";

export const createPlannerRouter = ({ plannerService }: AppDependencies["services"]) =>
    express
        .Router()
        .get<
            routes,
            paths["/planners"]["get"]["parameters"]["path"],
            paths["/planners"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/planners"]["get"]["requestBody"],
            paths["/planners"]["get"]["parameters"]["query"]
        >("/planners", async ({ session }, res) => plannerService.getAll(session.userId).then(res.status(200).json))
        .get<
            routes,
            paths["/planners/{plannerId}"]["get"]["parameters"]["path"],
            paths["/planners/{plannerId}"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}"]["get"]["requestBody"],
            paths["/planners/{plannerId}"]["get"]["parameters"]["query"]
        >("/planners/:plannerId", async ({ params, session }, res) => {
            const data = await plannerService.get(session.userId, params.plannerId);
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/planners"]["post"]["parameters"]["path"],
            paths["/planners"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/planners"]["post"]["requestBody"]["content"]["application/json"],
            paths["/planners"]["post"]["parameters"]["query"]
        >("/planners", async ({ body, session }, res) => {
            const data = await plannerService.create(session.userId, body);
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/planners/{plannerId}"]["patch"]["parameters"]["path"],
            paths["/planners/{plannerId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}"]["patch"]["parameters"]["query"]
        >("/planners/:plannerId", async ({ params, body, session }, res) => {
            const data = await plannerService.update(session.userId, params.plannerId, body);
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/planners/{plannerId}"]["delete"]["parameters"]["path"],
            paths["/planners/{plannerId}"]["delete"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}"]["delete"]["requestBody"],
            paths["/planners/{plannerId}"]["delete"]["parameters"]["query"]
        >("/planners/:plannerId", async ({ params, session }, res) => {
            await plannerService.delete(session.userId, params.plannerId);
            return res.status(204).send();
        })
        .get<
            routes,
            paths["/planners/{plannerId}/meals/{year}/{month}"]["get"]["parameters"]["path"],
            paths["/planners/{plannerId}/meals/{year}/{month}"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}/meals/{year}/{month}"]["get"]["requestBody"],
            paths["/planners/{plannerId}/meals/{year}/{month}"]["get"]["parameters"]["query"]
        >("/planners/:plannerId/meals/:year/:month", async ({ params, session }, res) => {
            const data = await plannerService.getMeals(session.userId, params.plannerId, params.year, params.month);
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/planners/{plannerId}/meals"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/meals"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/planners/{plannerId}/meals"]["post"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}/meals"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/meals", async ({ params, body, session }, res) => {
            const [data] = await plannerService.createMeals(session.userId, params.plannerId, EnsureArray(body));
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/planners/{plannerId}/meals/{mealId}"]["patch"]["parameters"]["path"],
            paths["/planners/{plannerId}/meals/{mealId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}/meals/{mealId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}/meals/{mealId}"]["patch"]["parameters"]["query"]
        >("/planners/:plannerId/meals/:mealId", async ({ params, body, session }, res) => {
            const data = await plannerService.updateMeal(session.userId, params.plannerId, params.mealId, body);
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/planners/{plannerId}/members"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/members"]["post"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}/members"]["post"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}/members"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/members", async ({ params, session }, res) => {
            await plannerService.joinMembership(session.userId, params.plannerId);
            return res.status(200).json();
        })
        .delete<
            routes,
            paths["/planners/{plannerId}/meals/{mealId}"]["delete"]["parameters"]["path"],
            paths["/planners/{plannerId}/meals/{mealId}"]["delete"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/meals/{mealId}"]["delete"]["requestBody"],
            paths["/planners/{plannerId}/meals/{mealId}"]["delete"]["parameters"]["query"]
        >("/planners/:plannerId/meals/:mealId", async ({ params, session }, res) => {
            await plannerService.deleteMeal(session.userId, params.plannerId, params.mealId);
            return res.status(204).send();
        })
        .delete<
            routes,
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["parameters"]["path"],
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["requestBody"],
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["parameters"]["query"]
        >("/planners/:plannerId/members/:userId", async ({ params, session }, res) => {
            await plannerService.leaveMembership(session.userId, params.plannerId, params.userId);
            return res.status(200).json();
        });
