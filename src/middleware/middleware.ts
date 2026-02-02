import type { RequestHandler } from "express";
import type { AppDependencies } from "../appDependencies.ts";

// biome-ignore lint/suspicious/noExplicitAny: any is needed to pass through openapi validated route types
export type Middleware = RequestHandler<any, any, any, any>;

export type CreateMiddleware<KServices extends keyof AppDependencies = never> =
    [KServices] extends [never]
        ? () => Middleware[]
        : (services: Pick<AppDependencies, KServices>) => Middleware[];
