import express from "express";

import { EnsureArray } from "../utils/index.ts";
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
        >("/lists", async ({ session }, res) => {
            const data = await listService.getAll(session.userId);
            return res.status(200).json(data);
        })
        .get<
            routes,
            paths["/lists/{listId}"]["get"]["parameters"]["path"],
            paths["/lists/{listId}"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}"]["get"]["requestBody"],
            paths["/lists/{listId}"]["get"]["parameters"]["query"]
        >("/lists/:listId", async ({ params, session }, res) => {
            const data = await listService.get(session.userId, params.listId);
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/lists"]["post"]["parameters"]["path"],
            paths["/lists"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/lists"]["post"]["requestBody"]["content"]["application/json"],
            paths["/lists"]["post"]["parameters"]["query"]
        >("/lists", async ({ body, session }, res) => {
            const data = await listService.create(session.userId, body);
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/lists/{listId}"]["patch"]["parameters"]["path"],
            paths["/lists/{listId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/lists/{listId}"]["patch"]["parameters"]["query"]
        >("/lists/:listId", async ({ params, body, session }, res) => {
            const data = await listService.update(
                session.userId,
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
        >("/lists/:listId", async ({ params, session }, res) => {
            await listService.delete(session.userId, params.listId);
            return res.status(204).send();
        })
        .get<
            routes,
            paths["/lists/{listId}/items"]["get"]["parameters"]["path"],
            paths["/lists/{listId}/items"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}/items"]["get"]["requestBody"],
            paths["/lists/{listId}/items"]["get"]["parameters"]["query"]
        >("/lists/:listId/items", async ({ params, session }, res) => {
            const data = await listService.getItems(
                session.userId,
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
        >("/lists/:listId/items", async ({ params, body, session }, res) => {
            const data = await listService.createItems(
                session.userId,
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
        >(
            "/lists/:listId/items/:itemId",
            async ({ params, body, session }, res) => {
                const data = await listService.updateItem(
                    session.userId,
                    params.listId,
                    params.itemId,
                    body,
                );
                return res.status(200).json(data);
            },
        )
        .delete<
            routes,
            paths["/lists/{listId}/items/{itemId}"]["delete"]["parameters"]["path"],
            paths["/lists/{listId}/items/{itemId}"]["delete"]["responses"]["204"]["content"],
            paths["/lists/{listId}/items/{itemId}"]["delete"]["requestBody"],
            paths["/lists/{listId}/items/{itemId}"]["delete"]["parameters"]["query"]
        >("/lists/:listId/items/:itemId", async ({ params, session }, res) => {
            await listService.deleteItem(
                session.userId,
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
        >(
            "/lists/:listId/items/move",
            async ({ params, body, session }, res) => {
                const data = await listService.moveItems(
                    session.userId,
                    params.listId,
                    body.itemIds,
                    body.destinationListId,
                );
                return res.status(200).json(data);
            },
        )
        .get<
            routes,
            paths["/lists/{listId}/members"]["get"]["parameters"]["path"],
            paths["/lists/{listId}/members"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/lists/{listId}/members"]["get"]["requestBody"],
            paths["/lists/{listId}/members"]["get"]["parameters"]["query"]
        >("/lists/:listId/members", async ({ params, session }, res) => {
            const data = await listService.getMembers(
                session.userId,
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
        >("/lists/:listId/members", async ({ params, body, session }, res) => {
            await listService.inviteMember(
                session.userId,
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
        >(
            "/lists/:listId/members/:userId",
            async ({ params, body, session }, res) => {
                const data = await listService.updateMember(
                    session.userId,
                    params.listId,
                    params.userId,
                    body.status,
                );
                return res.status(200).json(data);
            },
        )
        .delete<
            routes,
            paths["/lists/{listId}/members/{userId}"]["delete"]["parameters"]["path"],
            paths["/lists/{listId}/members/{userId}"]["delete"]["responses"]["204"]["content"],
            paths["/lists/{listId}/members/{userId}"]["delete"]["requestBody"],
            paths["/lists/{listId}/members/{userId}"]["delete"]["parameters"]["query"]
        >(
            "/lists/:listId/members/:userId",
            async ({ params, session }, res) => {
                await listService.removeMember(
                    session.userId,
                    params.listId,
                    params.userId,
                );
                return res.status(204).send();
            },
        )
        .post<
            routes,
            paths["/lists/{listId}/invite/accept"]["post"]["parameters"]["path"],
            paths["/lists/{listId}/invite/accept"]["post"]["responses"]["204"]["content"],
            paths["/lists/{listId}/invite/accept"]["post"]["requestBody"],
            paths["/lists/{listId}/invite/accept"]["post"]["parameters"]["query"]
        >("/lists/:listId/invite/accept", async ({ params, session }, res) => {
            await listService.acceptInvite(session.userId, params.listId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/lists/{listId}/invite/decline"]["post"]["parameters"]["path"],
            paths["/lists/{listId}/invite/decline"]["post"]["responses"]["204"]["content"],
            paths["/lists/{listId}/invite/decline"]["post"]["requestBody"],
            paths["/lists/{listId}/invite/decline"]["post"]["parameters"]["query"]
        >("/lists/:listId/invite/decline", async ({ params, session }, res) => {
            await listService.declineInvite(session.userId, params.listId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/lists/{listId}/leave"]["post"]["parameters"]["path"],
            paths["/lists/{listId}/leave"]["post"]["responses"]["204"]["content"],
            paths["/lists/{listId}/leave"]["post"]["requestBody"],
            paths["/lists/{listId}/leave"]["post"]["parameters"]["query"]
        >("/lists/:listId/leave", async ({ params, session }, res) => {
            await listService.leaveList(session.userId, params.listId);
            return res.status(204).send();
        });
