import express from "express";

import { notFoundMiddleware } from "../middleware";
import { default as authRouter } from "./auth";
import { default as mealsRouter } from "./meals";
import { default as ingredientRouter } from "./ingredient";
import { default as usersRouter } from "./users";
import { default as categoriesRouter } from "./categories";
import { default as attachmentsRouter } from "./attachments";
import { default as listsRouter } from "./lists";
import { default as docsRouter } from "./docs";

const appRouter = express.Router();

appRouter.use("/users", usersRouter);
appRouter.use("/categories", categoriesRouter);
appRouter.use("/meals", mealsRouter);
appRouter.use("/ingredient", ingredientRouter);
appRouter.use("/attachments", attachmentsRouter);
appRouter.use("/lists", listsRouter);

appRouter.use("/", notFoundMiddleware);

export {
    appRouter as default,
    attachmentsRouter,
    authRouter,
    categoriesRouter,
    docsRouter,
    ingredientRouter,
    listsRouter,
    mealsRouter,
    usersRouter,
};
