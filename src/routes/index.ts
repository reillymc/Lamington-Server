import express from "express";
import {
    createAuthenticationMiddleware,
    errorMiddleware,
    loggerMiddleware,
    notFoundMiddleware,
} from "../middleware/index.ts";
import { validationMiddleware } from "../middleware/validator.ts";
import { createAssetsRouter } from "./assets.ts";
import { createAttachmentsRouter } from "./attachments.ts";
import { createAuthRouter } from "./auth.ts";
import { createBookRouter } from "./books.ts";
import { createCooklistRouter } from "./cookLists.ts";
import { createDocsRouter } from "./docs.ts";
import { createExtractorRouter } from "./extractor.ts";
import { createHealthRouter } from "./health.ts";
import { createListRouter } from "./lists.ts";
import { createMealRouter } from "./meals.ts";
import { createPlannerRouter } from "./planners.ts";
import { createProfileRouter } from "./profile.ts";
import { createRecipeRouter } from "./recipes.ts";
import type { CreateRouter } from "./route.ts";
import { createTagsRouter } from "./tags.ts";
import { createUserRouter } from "./users.ts";

export const createAppRouter: CreateRouter<
    | "userService"
    | "attachmentService"
    | "bookService"
    | "contentExtractionService"
    | "cooklistService"
    | "listService"
    | "mealService"
    | "plannerService"
    | "recipeService"
    | "tagService"
> = (services) =>
    express
        .Router()
        .use(loggerMiddleware)
        .use("/health", createHealthRouter({}))
        .use(
            "/v1",
            express
                .Router()
                .use(createAuthRouter(services))
                .use(createAuthenticationMiddleware(services))
                .use(validationMiddleware)
                .use(createAssetsRouter({}))
                .use(createAttachmentsRouter(services))
                .use(createBookRouter(services))
                .use(createCooklistRouter(services))
                .use(createExtractorRouter(services))
                .use(createListRouter(services))
                .use(createMealRouter(services))
                .use(createPlannerRouter(services))
                .use(createProfileRouter(services))
                .use(createRecipeRouter(services))
                .use(createTagsRouter(services))
                .use(createUserRouter(services)),
        )
        .use("/", createDocsRouter({}))
        .use(notFoundMiddleware)
        .use(errorMiddleware);
