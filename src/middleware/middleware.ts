import type { RequestHandler } from "express";
import type { AppDependencies } from "../appDependencies.ts";

export type CreateMiddleware<KServices extends keyof AppDependencies> = (
    services: Pick<AppDependencies, KServices>,
) => RequestHandler;
