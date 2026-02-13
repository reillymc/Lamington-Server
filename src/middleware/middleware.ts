import type { RequestHandler } from "express";

// biome-ignore lint/suspicious/noExplicitAny: any is needed to pass through openapi validated route types
export type Middleware = RequestHandler<any, any, any, any>;

export type CreateMiddleware<TConfig extends Record<string, unknown> = never> =
    [TConfig] extends [never]
        ? () => Middleware[]
        : (config: TConfig) => Middleware[];
