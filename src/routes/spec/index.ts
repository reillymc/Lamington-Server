import type { components, paths } from "./schema.d.ts";

type ToRoutes<T extends string> =
    T extends `${infer Head}{${infer Param}}${infer Tail}`
        ? `${Head}:${Param}${ToRoutes<Tail>}`
        : T;

type routes = ToRoutes<keyof paths>;

export type { paths, routes, components };
