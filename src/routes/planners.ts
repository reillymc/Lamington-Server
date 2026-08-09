import { EnsureArray } from "@reillymc/es-utils";
import express from "express";
import { getSession } from "../middleware/session.ts";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createPlannerRouter: CreateRouter<"plannerService"> = ({
    plannerService,
}) =>
    express
        .Router()
        .get<
            routes,
            paths["/planners"]["get"]["parameters"]["path"],
            paths["/planners"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/planners"]["get"]["requestBody"],
            paths["/planners"]["get"]["parameters"]["query"]
        >("/planners", async (_req, res) => {
            const data = await plannerService.getAll(getSession().userId);
            return res.status(200).json(data);
        })
        .get<
            routes,
            paths["/planners/{plannerId}"]["get"]["parameters"]["path"],
            paths["/planners/{plannerId}"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}"]["get"]["requestBody"],
            paths["/planners/{plannerId}"]["get"]["parameters"]["query"]
        >("/planners/:plannerId", async ({ params }, res) => {
            const data = await plannerService.get(
                getSession().userId,
                params.plannerId,
            );
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/planners"]["post"]["parameters"]["path"],
            paths["/planners"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/planners"]["post"]["requestBody"]["content"]["application/json"],
            paths["/planners"]["post"]["parameters"]["query"]
        >("/planners", async ({ body }, res) => {
            const data = await plannerService.create(getSession().userId, body);
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/planners/{plannerId}"]["patch"]["parameters"]["path"],
            paths["/planners/{plannerId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}"]["patch"]["parameters"]["query"]
        >("/planners/:plannerId", async ({ params, body }, res) => {
            const data = await plannerService.update(
                getSession().userId,
                params.plannerId,
                body,
            );
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/planners/{plannerId}"]["delete"]["parameters"]["path"],
            paths["/planners/{plannerId}"]["delete"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}"]["delete"]["requestBody"],
            paths["/planners/{plannerId}"]["delete"]["parameters"]["query"]
        >("/planners/:plannerId", async ({ params }, res) => {
            await plannerService.delete(getSession().userId, params.plannerId);
            return res.status(204).send();
        })
        .get<
            routes,
            paths["/planners/{plannerId}/meals/{year}/{month}"]["get"]["parameters"]["path"],
            paths["/planners/{plannerId}/meals/{year}/{month}"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}/meals/{year}/{month}"]["get"]["requestBody"],
            paths["/planners/{plannerId}/meals/{year}/{month}"]["get"]["parameters"]["query"]
        >(
            "/planners/:plannerId/meals/:year/:month",
            async ({ params }, res) => {
                const data = await plannerService.getMeals(
                    getSession().userId,
                    params.plannerId,
                    params.year,
                    params.month,
                );
                return res.status(200).json(data);
            },
        )
        .post<
            routes,
            paths["/planners/{plannerId}/meals"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/meals"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/planners/{plannerId}/meals"]["post"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}/meals"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/meals", async ({ params, body }, res) => {
            const data = await plannerService.createMeals(
                getSession().userId,
                params.plannerId,
                EnsureArray(body),
            );
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/planners/{plannerId}/meals/{mealId}"]["patch"]["parameters"]["path"],
            paths["/planners/{plannerId}/meals/{mealId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}/meals/{mealId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}/meals/{mealId}"]["patch"]["parameters"]["query"]
        >(
            "/planners/:plannerId/meals/:mealId",
            async ({ params, body }, res) => {
                const data = await plannerService.updateMeal(
                    getSession().userId,
                    params.plannerId,
                    params.mealId,
                    body,
                );
                return res.status(200).json(data);
            },
        )
        .delete<
            routes,
            paths["/planners/{plannerId}/meals/{mealId}"]["delete"]["parameters"]["path"],
            paths["/planners/{plannerId}/meals/{mealId}"]["delete"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/meals/{mealId}"]["delete"]["requestBody"],
            paths["/planners/{plannerId}/meals/{mealId}"]["delete"]["parameters"]["query"]
        >("/planners/:plannerId/meals/:mealId", async ({ params }, res) => {
            await plannerService.deleteMeal(
                getSession().userId,
                params.plannerId,
                params.mealId,
            );
            return res.status(204).send();
        })
        .get<
            routes,
            paths["/planners/{plannerId}/members"]["get"]["parameters"]["path"],
            paths["/planners/{plannerId}/members"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}/members"]["get"]["requestBody"],
            paths["/planners/{plannerId}/members"]["get"]["parameters"]["query"]
        >("/planners/:plannerId/members", async ({ params }, res) => {
            const data = await plannerService.getMembers(
                getSession().userId,
                params.plannerId,
            );
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/planners/{plannerId}/members"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/members"]["post"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/members"]["post"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}/members"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/members", async ({ params, body }, res) => {
            await plannerService.inviteMember(
                getSession().userId,
                params.plannerId,
                body.userId,
            );
            return res.status(204).send();
        })
        .patch<
            routes,
            paths["/planners/{plannerId}/members/{userId}"]["patch"]["parameters"]["path"],
            paths["/planners/{plannerId}/members/{userId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/planners/{plannerId}/members/{userId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/planners/{plannerId}/members/{userId}"]["patch"]["parameters"]["query"]
        >(
            "/planners/:plannerId/members/:userId",
            async ({ params, body }, res) => {
                const data = await plannerService.updateMember(
                    getSession().userId,
                    params.plannerId,
                    params.userId,
                    body.status,
                );
                return res.status(200).json(data);
            },
        )
        .delete<
            routes,
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["parameters"]["path"],
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["requestBody"],
            paths["/planners/{plannerId}/members/{userId}"]["delete"]["parameters"]["query"]
        >("/planners/:plannerId/members/:userId", async ({ params }, res) => {
            await plannerService.removeMember(
                getSession().userId,
                params.plannerId,
                params.userId,
            );
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/planners/{plannerId}/invite/accept"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/invite/accept"]["post"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/invite/accept"]["post"]["requestBody"],
            paths["/planners/{plannerId}/invite/accept"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/invite/accept", async ({ params }, res) => {
            await plannerService.acceptInvite(
                getSession().userId,
                params.plannerId,
            );
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/planners/{plannerId}/invite/decline"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/invite/decline"]["post"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/invite/decline"]["post"]["requestBody"],
            paths["/planners/{plannerId}/invite/decline"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/invite/decline", async ({ params }, res) => {
            await plannerService.declineInvite(
                getSession().userId,
                params.plannerId,
            );
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/planners/{plannerId}/leave"]["post"]["parameters"]["path"],
            paths["/planners/{plannerId}/leave"]["post"]["responses"]["204"]["content"],
            paths["/planners/{plannerId}/leave"]["post"]["requestBody"],
            paths["/planners/{plannerId}/leave"]["post"]["parameters"]["query"]
        >("/planners/:plannerId/leave", async ({ params }, res) => {
            await plannerService.leavePlanner(
                getSession().userId,
                params.plannerId,
            );
            return res.status(204).send();
        });
