import { EnsureArray } from "@reillymc/es-utils";
import express from "express";
import { getSession } from "../middleware/session.ts";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createListRouter: CreateRouter<"listService"> = ({
    listService,
}) =>
    express
        .Router()
        .get<
            routes,
            paths["/lists"]["get"]["parameters"]["path"],
            paths["/lists"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/lists"]["get"]["requestBody"],
            paths["/lists"]["get"]["parameters"]["query"]
        >("/lists", async (_req, res) => {
            const data = await listService.getAll(getSession().userId);
            return res.status(200).json(data);
        })
        .get<
            routes,
            paths["/lists/{listId}"]["get"]["parameters"]["path"],
            paths["/lists/{listId}"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}"]["get"]["requestBody"],
            paths["/lists/{listId}"]["get"]["parameters"]["query"]
        >("/lists/:listId", async ({ params }, res) => {
            const data = await listService.get(
                getSession().userId,
                params.listId,
            );
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/lists"]["post"]["parameters"]["path"],
            paths["/lists"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/lists"]["post"]["requestBody"]["content"]["application/json"],
            paths["/lists"]["post"]["parameters"]["query"]
        >("/lists", async ({ body }, res) => {
            const data = await listService.create(getSession().userId, body);
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/lists/{listId}"]["patch"]["parameters"]["path"],
            paths["/lists/{listId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/lists/{listId}"]["patch"]["parameters"]["query"]
        >("/lists/:listId", async ({ params, body }, res) => {
            const data = await listService.update(
                getSession().userId,
                params.listId,
                body,
            );
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/lists/{listId}"]["delete"]["parameters"]["path"],
            paths["/lists/{listId}"]["delete"]["responses"]["204"]["content"],
            paths["/lists/{listId}"]["delete"]["requestBody"],
            paths["/lists/{listId}"]["delete"]["parameters"]["query"]
        >("/lists/:listId", async ({ params }, res) => {
            await listService.delete(getSession().userId, params.listId);
            return res.status(204).send();
        })
        .get<
            routes,
            paths["/lists/{listId}/items"]["get"]["parameters"]["path"],
            paths["/lists/{listId}/items"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}/items"]["get"]["requestBody"],
            paths["/lists/{listId}/items"]["get"]["parameters"]["query"]
        >("/lists/:listId/items", async ({ params }, res) => {
            const data = await listService.getItems(
                getSession().userId,
                params.listId,
            );
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/lists/{listId}/items"]["post"]["parameters"]["path"],
            paths["/lists/{listId}/items"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/lists/{listId}/items"]["post"]["requestBody"]["content"]["application/json"],
            paths["/lists/{listId}/items"]["post"]["parameters"]["query"]
        >("/lists/:listId/items", async ({ params, body }, res) => {
            const data = await listService.createItems(
                getSession().userId,
                params.listId,
                EnsureArray(body),
            );
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/lists/{listId}/items/{itemId}"]["patch"]["parameters"]["path"],
            paths["/lists/{listId}/items/{itemId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}/items/{itemId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/lists/{listId}/items/{itemId}"]["patch"]["parameters"]["query"]
        >("/lists/:listId/items/:itemId", async ({ params, body }, res) => {
            const data = await listService.updateItem(
                getSession().userId,
                params.listId,
                params.itemId,
                body,
            );
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/lists/{listId}/items/{itemId}"]["delete"]["parameters"]["path"],
            paths["/lists/{listId}/items/{itemId}"]["delete"]["responses"]["204"]["content"],
            paths["/lists/{listId}/items/{itemId}"]["delete"]["requestBody"],
            paths["/lists/{listId}/items/{itemId}"]["delete"]["parameters"]["query"]
        >("/lists/:listId/items/:itemId", async ({ params }, res) => {
            await listService.deleteItem(
                getSession().userId,
                params.listId,
                params.itemId,
            );
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/lists/{listId}/items/move"]["post"]["parameters"]["path"],
            paths["/lists/{listId}/items/move"]["post"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}/items/move"]["post"]["requestBody"]["content"]["application/json"],
            paths["/lists/{listId}/items/move"]["post"]["parameters"]["query"]
        >("/lists/:listId/items/move", async ({ params, body }, res) => {
            const data = await listService.moveItems(
                getSession().userId,
                params.listId,
                body.itemIds,
                body.destinationListId,
            );
            return res.status(200).json(data);
        })
        .get<
            routes,
            paths["/lists/{listId}/members"]["get"]["parameters"]["path"],
            paths["/lists/{listId}/members"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}/members"]["get"]["requestBody"],
            paths["/lists/{listId}/members"]["get"]["parameters"]["query"]
        >("/lists/:listId/members", async ({ params }, res) => {
            const data = await listService.getMembers(
                getSession().userId,
                params.listId,
            );
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/lists/{listId}/members"]["post"]["parameters"]["path"],
            paths["/lists/{listId}/members"]["post"]["responses"]["204"]["content"],
            paths["/lists/{listId}/members"]["post"]["requestBody"]["content"]["application/json"],
            paths["/lists/{listId}/members"]["post"]["parameters"]["query"]
        >("/lists/:listId/members", async ({ params, body }, res) => {
            await listService.inviteMember(
                getSession().userId,
                params.listId,
                body.userId,
            );
            return res.status(204).send();
        })
        .patch<
            routes,
            paths["/lists/{listId}/members/{userId}"]["patch"]["parameters"]["path"],
            paths["/lists/{listId}/members/{userId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}/members/{userId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/lists/{listId}/members/{userId}"]["patch"]["parameters"]["query"]
        >("/lists/:listId/members/:userId", async ({ params, body }, res) => {
            const data = await listService.updateMember(
                getSession().userId,
                params.listId,
                params.userId,
                body.status,
            );
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/lists/{listId}/members/{userId}"]["delete"]["parameters"]["path"],
            paths["/lists/{listId}/members/{userId}"]["delete"]["responses"]["204"]["content"],
            paths["/lists/{listId}/members/{userId}"]["delete"]["requestBody"],
            paths["/lists/{listId}/members/{userId}"]["delete"]["parameters"]["query"]
        >("/lists/:listId/members/:userId", async ({ params }, res) => {
            await listService.removeMember(
                getSession().userId,
                params.listId,
                params.userId,
            );
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/lists/{listId}/invite/accept"]["post"]["parameters"]["path"],
            paths["/lists/{listId}/invite/accept"]["post"]["responses"]["204"]["content"],
            paths["/lists/{listId}/invite/accept"]["post"]["requestBody"],
            paths["/lists/{listId}/invite/accept"]["post"]["parameters"]["query"]
        >("/lists/:listId/invite/accept", async ({ params }, res) => {
            await listService.acceptInvite(getSession().userId, params.listId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/lists/{listId}/invite/decline"]["post"]["parameters"]["path"],
            paths["/lists/{listId}/invite/decline"]["post"]["responses"]["204"]["content"],
            paths["/lists/{listId}/invite/decline"]["post"]["requestBody"],
            paths["/lists/{listId}/invite/decline"]["post"]["parameters"]["query"]
        >("/lists/:listId/invite/decline", async ({ params }, res) => {
            await listService.declineInvite(getSession().userId, params.listId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/lists/{listId}/leave"]["post"]["parameters"]["path"],
            paths["/lists/{listId}/leave"]["post"]["responses"]["204"]["content"],
            paths["/lists/{listId}/leave"]["post"]["requestBody"],
            paths["/lists/{listId}/leave"]["post"]["parameters"]["query"]
        >("/lists/:listId/leave", async ({ params }, res) => {
            await listService.leaveList(getSession().userId, params.listId);
            return res.status(204).send();
        });
