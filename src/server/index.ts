import express from "express";
import { AppError } from "../logging";

import * as Routes from "./routes";

const appRouter = express.Router();

appRouter.use("/users", Routes.usersRouter);
appRouter.use("/chores", Routes.choresRouter);
appRouter.use("/categories", Routes.categoriesRouter);
appRouter.use("/meals", Routes.mealsRouter);
appRouter.use("/ingredient", Routes.ingredientRouter);
appRouter.use("/attachments", Routes.attachmentsRouter);
appRouter.use("/lists", Routes.listsRouter);

/** Catch all routes and send to docs (for now) */
appRouter.use("/", Routes.docsRouter);

/** Catch 404 and forward to error handler */
appRouter.use(function (req, res, next) {
    next(new AppError(404, "Not Found", "The requested resource could not be found."));
});

export default appRouter;
