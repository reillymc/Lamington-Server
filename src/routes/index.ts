import express from "express";

import { notFoundMiddleware } from "../middleware";
import { default as attachmentsRouter } from "./attachments";
import { default as authRouter } from "./auth";
import { default as booksRouter } from "./books";
import { default as cookListsRouter } from "./cookLists";
import { default as docsRouter } from "./docs";
import { default as ingredientRouter } from "./ingredient";
import { default as listsRouter } from "./lists";
import { default as plannersRouter } from "./planners";
import { default as recipesRouter } from "./recipes";
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
} from "./spec";
import { default as tagsRouter } from "./tags";
import { default as usersRouter } from "./users";

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
