import express from "express";

import * as Routes from "./routes";

const appRouter = express.Router();

appRouter.use("/users", Routes.usersRouter);
appRouter.use("/chores", Routes.choresRouter);
appRouter.use("/categories", Routes.categoriesRouter);
appRouter.use("/meals", Routes.mealsRouter);
appRouter.use("/ingredient", Routes.ingredientRouter);
appRouter.use("/attachments", Routes.attachmentsRouter);
appRouter.use("/lists", Routes.listsRouter);

export default appRouter;
