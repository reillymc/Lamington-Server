import express from "express";

import type { AppDependencies } from "../appDependencies.ts";
import { notFoundMiddleware } from "../middleware/index.ts";
import { validationMiddleware } from "../middleware/validator.ts";
import { createAttachmentsRouter } from "./attachments.ts";
import { createAuthRouter } from "./auth.ts";
import { createBookRouter } from "./books.ts";
import { createCooklistRouter } from "./cookLists.ts";
import { default as docsRouter } from "./docs.ts";
import { createExtractorRouter } from "./extractor.ts";
import { default as ingredientRouter } from "./ingredient.ts";
import { default as listsRouter } from "./lists.ts";
import { createMealRouter } from "./meals.ts";
import { createPlannerRouter } from "./planners.ts";
import { createRecipeRouter } from "./recipes.ts";
import {
    assetEndpoint,
    assetsDirectory,
    attachmentEndpoint,
    bookEndpoint,
    ingredientEndpoint,
    listEndpoint,
    recipeEndpoint,
    tagEndpoint,
    usersEndpoint,
} from "./spec/index.ts";
import { default as tagsRouter } from "./tags.ts";
import { default as usersRouter } from "./users.ts";

const appRouter = (appDependencies: AppDependencies) =>
    express
        .Router()
        .use(assetEndpoint, express.static(assetsDirectory))
        .use(attachmentEndpoint, createAttachmentsRouter(appDependencies))
        .use(bookEndpoint, createBookRouter(appDependencies.services))
        .use(ingredientEndpoint, ingredientRouter)
        .use(listEndpoint, listsRouter)
        .use(recipeEndpoint, createRecipeRouter(appDependencies.services))
        .use(tagEndpoint, tagsRouter)
        .use(usersEndpoint, usersRouter)
        .use(validationMiddleware)
        .use(createCooklistRouter(appDependencies.services))
        .use(createExtractorRouter(appDependencies.services))
        .use(createMealRouter(appDependencies.services))
        .use(createPlannerRouter(appDependencies.services))
        .use("/", notFoundMiddleware);

export { appRouter, createAuthRouter, docsRouter };
