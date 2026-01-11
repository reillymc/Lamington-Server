import type { RequestHandler } from "express";
import type { AppDependencies } from "../appDependencies.ts";

export type CreateMiddleware<KServices extends keyof AppDependencies["services"]> = (
    services: Pick<AppDependencies["services"], KServices>
) => RequestHandler;
