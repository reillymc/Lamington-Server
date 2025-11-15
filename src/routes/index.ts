import express from "express";

import { notFoundMiddleware } from "../middleware/index.ts";
import { createAttachmentsRouter } from "./attachments.ts";
import { default as authRouter } from "./auth.ts";
import { default as booksRouter } from "./books.ts";
import { default as cookListsRouter } from "./cookLists.ts";
import { default as docsRouter } from "./docs.ts";
import { default as ingredientRouter } from "./ingredient.ts";
import { default as listsRouter } from "./lists.ts";
import { default as plannersRouter } from "./planners.ts";
import { default as recipesRouter } from "./recipes.ts";
import {
    assetEndpoint,
    assetsDirectory,
    attachmentEndpoint,
    bookEndpoint,
    cookListEndpoint,
    ingredientEndpoint,
    listEndpoint,
    plannerEndpoint,
    recipeEndpoint,
    tagEndpoint,
    usersEndpoint,
} from "./spec/index.ts";
import { default as tagsRouter } from "./tags.ts";
import { default as usersRouter } from "./users.ts";
import type { Knex } from "knex";

const appRouter = (trx: Knex) =>
    express
        .Router()
        .use(assetEndpoint, express.static(assetsDirectory))
        .use(attachmentEndpoint, createAttachmentsRouter(trx))
        .use(bookEndpoint, booksRouter)
        .use(cookListEndpoint, cookListsRouter)
        .use(ingredientEndpoint, ingredientRouter)
        .use(listEndpoint, listsRouter)
        .use(plannerEndpoint, plannersRouter)
        .use(recipeEndpoint, recipesRouter)
        .use(tagEndpoint, tagsRouter)
        .use(usersEndpoint, usersRouter)
        .use("/", notFoundMiddleware);

export { appRouter, authRouter, docsRouter };
