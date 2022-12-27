import express from "express";

import { notFoundMiddleware } from "../middleware";
import { default as attachmentsRouter } from "./attachments";
import { default as authRouter } from "./auth";
import { default as booksRouter } from "./books";
import { default as categoriesRouter } from "./categories";
import { default as docsRouter } from "./docs";
import { default as ingredientRouter } from "./ingredient";
import { default as listsRouter } from "./lists";
import { default as recipesRouter } from "./recipes";
import { bookEndpoint, ingredientEndpoint, listEndpoint, usersEndpoint, recipeEndpoint } from "./spec";
import { default as usersRouter } from "./users";

const appRouter = express.Router();

appRouter.use("/attachments", attachmentsRouter);
appRouter.use(bookEndpoint, booksRouter);
appRouter.use("/categories", categoriesRouter);
appRouter.use(ingredientEndpoint, ingredientRouter);
appRouter.use(listEndpoint, listsRouter);
appRouter.use(recipeEndpoint, recipesRouter);
appRouter.use(usersEndpoint, usersRouter);

appRouter.use("/", notFoundMiddleware);

export {
    appRouter as default,
    attachmentsRouter,
    authRouter,
    categoriesRouter,
    docsRouter,
    ingredientRouter,
    listsRouter,
    recipesRouter,
    usersRouter,
};
