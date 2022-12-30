import express from "express";

import { notFoundMiddleware } from "../middleware";
import {
    attachmentEndpoint,
    bookEndpoint,
    ingredientEndpoint,
    listEndpoint,
    recipeEndpoint,
    tagEndpoint,
    usersEndpoint,
} from "./spec";
import { default as attachmentsRouter } from "./attachments";
import { default as authRouter } from "./auth";
import { default as booksRouter } from "./books";
import { default as docsRouter } from "./docs";
import { default as ingredientRouter } from "./ingredient";
import { default as listsRouter } from "./lists";
import { default as recipesRouter } from "./recipes";
import { default as tagsRouter } from "./tags";
import { default as usersRouter } from "./users";

const appRouter = express.Router();

appRouter.use(attachmentEndpoint, attachmentsRouter);
appRouter.use(bookEndpoint, booksRouter);
appRouter.use(ingredientEndpoint, ingredientRouter);
appRouter.use(listEndpoint, listsRouter);
appRouter.use(recipeEndpoint, recipesRouter);
appRouter.use(tagEndpoint, tagsRouter);
appRouter.use(usersEndpoint, usersRouter);

appRouter.use("/", notFoundMiddleware);

export { appRouter as default, authRouter, docsRouter };
