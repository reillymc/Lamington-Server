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
import { default as usersRouter } from "./users";

const appRouter = express.Router();

appRouter.use("/attachments", attachmentsRouter);
appRouter.use("/books", booksRouter);
appRouter.use("/categories", categoriesRouter);
appRouter.use("/ingredient", ingredientRouter);
appRouter.use("/lists", listsRouter);
appRouter.use("/recipes", recipesRouter);
appRouter.use("/users", usersRouter);

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
