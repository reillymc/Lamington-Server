import express from "express";

import { notFoundMiddleware } from "../middleware/index.ts";
import { default as attachmentsRouter } from "./attachments.ts";
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

const appRouter = express.Router();

appRouter.use(assetEndpoint, express.static(assetsDirectory));
appRouter.use(attachmentEndpoint, attachmentsRouter);
appRouter.use(bookEndpoint, booksRouter);
appRouter.use(cookListEndpoint, cookListsRouter);
appRouter.use(ingredientEndpoint, ingredientRouter);
appRouter.use(listEndpoint, listsRouter);
appRouter.use(plannerEndpoint, plannersRouter);
appRouter.use(recipeEndpoint, recipesRouter);
appRouter.use(tagEndpoint, tagsRouter);
appRouter.use(usersEndpoint, usersRouter);

appRouter.use("/", notFoundMiddleware);

export { authRouter, appRouter as default, docsRouter };
