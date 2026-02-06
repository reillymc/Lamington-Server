import type { RequestHandler } from "express";
import type { AppServices } from "../services/index.ts";

// biome-ignore lint/suspicious/noExplicitAny: any is needed to pass through openapi validated route types
export type Middleware = RequestHandler<any, any, any, any>;

export type CreateMiddleware<KServices extends keyof AppServices = never> = [
    KServices,
] extends [never]
    ? () => Middleware[]
    : (services: Pick<AppServices, KServices>) => Middleware[];
