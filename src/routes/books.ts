import express from "express";

import type { CreateRoute } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createBookRouter: CreateRoute<"bookService"> = ({ bookService }) =>
    express
        .Router()
        .get<
            routes,
            paths["/books"]["get"]["parameters"]["path"],
            paths["/books"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/books"]["get"]["requestBody"],
            paths["/books"]["get"]["parameters"]["query"]
        >("/books", async ({ session }, res) => {
            const data = await bookService.getAll(session.userId);
            return res.status(200).json(data);
        })
        .get<
            routes,
            paths["/books/{bookId}"]["get"]["parameters"]["path"],
            paths["/books/{bookId}"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/books/{bookId}"]["get"]["requestBody"],
            paths["/books/{bookId}"]["get"]["parameters"]["query"]
        >("/books/:bookId", async ({ params, session }, res) => {
            const data = await bookService.get(session.userId, params.bookId);
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/books"]["post"]["parameters"]["path"],
            paths["/books"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/books"]["post"]["requestBody"]["content"]["application/json"],
            paths["/books"]["post"]["parameters"]["query"]
        >("/books", async ({ body, session }, res) => {
            const data = await bookService.create(session.userId, body);
            return res.status(201).json(data);
        })
        .patch<
            routes,
            paths["/books/{bookId}"]["patch"]["parameters"]["path"],
            paths["/books/{bookId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/books/{bookId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/books/{bookId}"]["patch"]["parameters"]["query"]
        >("/books/:bookId", async ({ params, body, session }, res) => {
            const data = await bookService.update(
                session.userId,
                params.bookId,
                body,
            );
            return res.status(200).json(data);
        })
        .delete<
            routes,
            paths["/books/{bookId}"]["delete"]["parameters"]["path"],
            paths["/books/{bookId}"]["delete"]["responses"]["204"]["content"],
            paths["/books/{bookId}"]["delete"]["requestBody"],
            paths["/books/{bookId}"]["delete"]["parameters"]["query"]
        >("/books/:bookId", async ({ params, session }, res) => {
            await bookService.delete(session.userId, params.bookId);
            return res.status(204).send();
        })
        .get<
            routes,
            paths["/books/{bookId}/recipes"]["get"]["parameters"]["path"],
            paths["/books/{bookId}/recipes"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/books/{bookId}/recipes"]["get"]["requestBody"],
            paths["/books/{bookId}/recipes"]["get"]["parameters"]["query"]
        >("/books/:bookId/recipes", async ({ params, query, session }, res) => {
            const data = await bookService.getRecipes(
                session.userId,
                params.bookId,
                query?.page,
                query?.search,
                query?.sort,
                query?.order,
            );
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/books/{bookId}/recipes"]["post"]["parameters"]["path"],
            paths["/books/{bookId}/recipes"]["post"]["responses"]["201"]["content"]["application/json"],
            paths["/books/{bookId}/recipes"]["post"]["requestBody"]["content"]["application/json"],
            paths["/books/{bookId}/recipes"]["post"]["parameters"]["query"]
        >("/books/:bookId/recipes", async ({ params, body, session }, res) => {
            const data = await bookService.addRecipe(
                session.userId,
                params.bookId,
                body,
            );
            return res.status(201).json(data);
        })
        .delete<
            routes,
            paths["/books/{bookId}/recipes/{recipeId}"]["delete"]["parameters"]["path"],
            paths["/books/{bookId}/recipes/{recipeId}"]["delete"]["responses"]["204"]["content"],
            paths["/books/{bookId}/recipes/{recipeId}"]["delete"]["requestBody"],
            paths["/books/{bookId}/recipes/{recipeId}"]["delete"]["parameters"]["query"]
        >(
            "/books/:bookId/recipes/:recipeId",
            async ({ params, session }, res) => {
                await bookService.removeRecipe(
                    session.userId,
                    params.bookId,
                    params.recipeId,
                );
                return res.status(204).send();
            },
        )
        .get<
            routes,
            paths["/books/{bookId}/members"]["get"]["parameters"]["path"],
            paths["/books/{bookId}/members"]["get"]["responses"]["200"]["content"]["application/json"],
            paths["/books/{bookId}/members"]["get"]["requestBody"],
            paths["/books/{bookId}/members"]["get"]["parameters"]["query"]
        >("/books/:bookId/members", async ({ params, session }, res) => {
            const data = await bookService.getMembers(
                session.userId,
                params.bookId,
            );
            return res.status(200).json(data);
        })
        .post<
            routes,
            paths["/books/{bookId}/members"]["post"]["parameters"]["path"],
            paths["/books/{bookId}/members"]["post"]["responses"]["204"]["content"],
            paths["/books/{bookId}/members"]["post"]["requestBody"]["content"]["application/json"],
            paths["/books/{bookId}/members"]["post"]["parameters"]["query"]
        >("/books/:bookId/members", async ({ params, body, session }, res) => {
            await bookService.inviteMember(
                session.userId,
                params.bookId,
                body.userId,
            );
            return res.status(204).send();
        })
        .patch<
            routes,
            paths["/books/{bookId}/members/{userId}"]["patch"]["parameters"]["path"],
            paths["/books/{bookId}/members/{userId}"]["patch"]["responses"]["200"]["content"]["application/json"],
            paths["/books/{bookId}/members/{userId}"]["patch"]["requestBody"]["content"]["application/json"],
            paths["/books/{bookId}/members/{userId}"]["patch"]["parameters"]["query"]
        >(
            "/books/:bookId/members/:userId",
            async ({ params, body, session }, res) => {
                const data = await bookService.updateMember(
                    session.userId,
                    params.bookId,
                    params.userId,
                    body.status,
                );
                return res.status(200).json(data);
            },
        )
        .delete<
            routes,
            paths["/books/{bookId}/members/{userId}"]["delete"]["parameters"]["path"],
            paths["/books/{bookId}/members/{userId}"]["delete"]["responses"]["204"]["content"],
            paths["/books/{bookId}/members/{userId}"]["delete"]["requestBody"],
            paths["/books/{bookId}/members/{userId}"]["delete"]["parameters"]["query"]
        >(
            "/books/:bookId/members/:userId",
            async ({ params, session }, res) => {
                await bookService.removeMember(
                    session.userId,
                    params.bookId,
                    params.userId,
                );
                return res.status(204).send();
            },
        )
        .post<
            routes,
            paths["/books/{bookId}/invite/accept"]["post"]["parameters"]["path"],
            paths["/books/{bookId}/invite/accept"]["post"]["responses"]["204"]["content"],
            paths["/books/{bookId}/invite/accept"]["post"]["requestBody"],
            paths["/books/{bookId}/invite/accept"]["post"]["parameters"]["query"]
        >("/books/:bookId/invite/accept", async ({ params, session }, res) => {
            await bookService.acceptInvite(session.userId, params.bookId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/books/{bookId}/invite/decline"]["post"]["parameters"]["path"],
            paths["/books/{bookId}/invite/decline"]["post"]["responses"]["204"]["content"],
            paths["/books/{bookId}/invite/decline"]["post"]["requestBody"],
            paths["/books/{bookId}/invite/decline"]["post"]["parameters"]["query"]
        >("/books/:bookId/invite/decline", async ({ params, session }, res) => {
            await bookService.declineInvite(session.userId, params.bookId);
            return res.status(204).send();
        })
        .post<
            routes,
            paths["/books/{bookId}/leave"]["post"]["parameters"]["path"],
            paths["/books/{bookId}/leave"]["post"]["responses"]["204"]["content"],
            paths["/books/{bookId}/leave"]["post"]["requestBody"],
            paths["/books/{bookId}/leave"]["post"]["parameters"]["query"]
        >("/books/:bookId/leave", async ({ params, session }, res) => {
            await bookService.leaveBook(session.userId, params.bookId);
            return res.status(204).send();
        });
