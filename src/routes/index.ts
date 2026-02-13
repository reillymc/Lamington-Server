import express from "express";
import { createAssetsRouter } from "./assets.ts";
import {
    type AttachmentsRouterConfig,
    createAttachmentsRouter,
} from "./attachments.ts";
import { createAuthRouter } from "./auth.ts";
import { createBookRouter } from "./books.ts";
import { createCooklistRouter } from "./cooklists.ts";
import { createDocsRouter, type DocsRouterConfig } from "./docs.ts";
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

type AppRouterConfig = AttachmentsRouterConfig & DocsRouterConfig;

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
    | "tagService",
    | "rateLimiterControlled"
    | "rateLimiterLoose"
    | "rateLimiterRestrictive"
    | "validator"
    | "logger"
    | "errorHandler",
    AppRouterConfig
> = (services, middleware, config) =>
    express
        .Router()
        .use("/health", createHealthRouter())
        .use(middleware.logger)
        .use(
            "/v1",
            express
                .Router()
                .use(middleware.rateLimiterLoose)
                .use(middleware.validator)
                .use(createAuthRouter(services, middleware))
                .use(createAssetsRouter())
                .use(createAttachmentsRouter(services, middleware, config))
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
        .use("/", createDocsRouter(config))
        .use(middleware.errorHandler);
