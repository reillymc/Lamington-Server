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
        >("/planners", async ({ session }, res) => {
            const data = await plannerService.getAll(session.userId);
            return res.status(200).json(data);
        })
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
            const data = await plannerService.createMeals(session.userId, params.plannerId, EnsureArray(body));
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
        .get<
            routes,
            paths["/planners/{plannerId}/members"]["get"]["parameters"]["path"],
            paths["/planners/{plannerId}/members"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}/members"]["get"]["requestBody"],
            paths["/planners/{plannerId}/members"]["get"]["parameters"]["query"]
        >("/planners/:plannerId/members", async ({ params, session }, res) => {
            const data = await plannerService.getMembers(session.userId, params.plannerId);
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/planners/{plannerId}/members"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/members"]["post"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/members"]["post"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}/members"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/members", async ({ params, body, session }, res) => {
            await plannerService.inviteMember(session.userId, params.plannerId, body.userId);
            return res.status(204).send();
        })
        .patch<
            routes,
            paths["/planners/{plannerId}/members/{userId}"]["patch"]["parameters"]["path"],
            paths["/planners/{plannerId}/members/{userId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}/members/{userId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}/members/{userId}"]["patch"]["parameters"]["query"]
        >("/planners/:plannerId/members/:userId", async ({ params, body, session }, res) => {
            const data = await plannerService.updateMember(
                session.userId,
                params.plannerId,
                params.userId,
                body.status
            );
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["parameters"]["path"],
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["requestBody"],
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["parameters"]["query"]
        >("/planners/:plannerId/members/:userId", async ({ params, session }, res) => {
            await plannerService.removeMember(session.userId, params.plannerId, params.userId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/planners/{plannerId}/invite/accept"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/invite/accept"]["post"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/invite/accept"]["post"]["requestBody"],
            paths["/planners/{plannerId}/invite/accept"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/invite/accept", async ({ params, session }, res) => {
            await plannerService.acceptInvite(session.userId, params.plannerId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/planners/{plannerId}/invite/decline"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/invite/decline"]["post"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/invite/decline"]["post"]["requestBody"],
            paths["/planners/{plannerId}/invite/decline"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/invite/decline", async ({ params, session }, res) => {
            await plannerService.declineInvite(session.userId, params.plannerId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/planners/{plannerId}/leave"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/leave"]["post"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/leave"]["post"]["requestBody"],
            paths["/planners/{plannerId}/leave"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/leave", async ({ params, session }, res) => {
            await plannerService.leavePlanner(session.userId, params.plannerId);
            return res.status(204).send();
        });
