import express from "express";

import { notFoundMiddleware } from "../middleware/index.ts";
import { createAttachmentsRouter } from "./attachments.ts";
import { createAuthRouter } from "./auth.ts";
import { createBookRouter } from "./books.ts";
import { default as cookListsRouter } from "./cookLists.ts";
import { default as docsRouter } from "./docs.ts";
import { default as ingredientRouter } from "./ingredient.ts";
import { default as listsRouter } from "./lists.ts";
import { default as plannersRouter } from "./planners.ts";
import { createRecipeRouter } from "./recipes.ts";
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
import type { AppDependencies } from "../appDependencies.ts";
import { extractorEndpoint } from "./spec/extractor.ts";
import { createExtractorRouter } from "./extractor.ts";

const appRouter = (appDependencies: AppDependencies) =>
    express
        .Router()
        .use(assetEndpoint, express.static(assetsDirectory))
        .use(attachmentEndpoint, createAttachmentsRouter(appDependencies))
        .use(bookEndpoint, createBookRouter(appDependencies.services))
        .use(cookListEndpoint, cookListsRouter)
        .use(ingredientEndpoint, ingredientRouter)
        .use(listEndpoint, listsRouter)
        .use(plannerEndpoint, plannersRouter)
        .use(recipeEndpoint, createRecipeRouter(appDependencies.services))
        .use(tagEndpoint, tagsRouter)
        .use(usersEndpoint, usersRouter)
        .use(extractorEndpoint, createExtractorRouter(appDependencies.services))
        .use("/", notFoundMiddleware);

export { appRouter, createAuthRouter, docsRouter };
