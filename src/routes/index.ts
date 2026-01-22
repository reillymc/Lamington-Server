import express from "express";

import type { AppDependencies } from "../appDependencies.ts";
import { createAuthenticationMiddleware, notFoundMiddleware } from "../middleware/index.ts";
import { validationMiddleware } from "../middleware/validator.ts";
import { createAttachmentsRouter } from "./attachments.ts";
import { createAuthRouter } from "./auth.ts";
import { createBookRouter } from "./books.ts";
import { createCooklistRouter } from "./cookLists.ts";
import { default as docsRouter } from "./docs.ts";
import { createExtractorRouter } from "./extractor.ts";
import { createListRouter } from "./lists.ts";
import { createMealRouter } from "./meals.ts";
import { createPlannerRouter } from "./planners.ts";
import { createRecipeRouter } from "./recipes.ts";
import {
    assetEndpoint,
    assetsDirectory,
    attachmentEndpoint,
    bookEndpoint,
    recipeEndpoint,
    tagEndpoint,
} from "./spec/index.ts";
import { default as tagsRouter } from "./tags.ts";
import { createProfileRouter } from "./profile.ts";
import { createUserRouter } from "./users.ts";

// TODO  createAppRouter :CreateRoute<all needed services>
const createAppRouter = (appDependencies: AppDependencies) =>
    express
        .Router()
        .use(createAuthenticationMiddleware(appDependencies.services))
        .use(assetEndpoint, express.static(assetsDirectory))
        .use(attachmentEndpoint, createAttachmentsRouter(appDependencies))
        .use(bookEndpoint, createBookRouter(appDependencies.services))
        .use(recipeEndpoint, createRecipeRouter(appDependencies.services))
        .use(tagEndpoint, tagsRouter)
        .use(validationMiddleware)
        .use(createAuthRouter(appDependencies.services))
        .use(createCooklistRouter(appDependencies.services))
        .use(createExtractorRouter(appDependencies.services))
        .use(createListRouter(appDependencies.services))
        .use(createMealRouter(appDependencies.services))
        .use(createPlannerRouter(appDependencies.services))
        .use(createProfileRouter(appDependencies.services))
        .use(createUserRouter(appDependencies.services))
        .use("/", notFoundMiddleware);

export { createAppRouter, createAuthRouter, docsRouter };
