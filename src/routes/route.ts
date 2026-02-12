import type { Router } from "express";
import type { AppMiddleware } from "../middleware/index.ts";
import type { AppServices } from "../services/index.ts";

export type CreateRouter<
    KServices extends keyof AppServices = never,
    KLimiters extends keyof AppMiddleware = never,
    TConfig extends Record<string, unknown> = never,
> = [KServices] extends [never]
    ? [TConfig] extends [never]
        ? () => Router
        : (config: TConfig) => Router
    : [TConfig] extends [never]
      ? [KLimiters] extends [never]
          ? (services: Pick<AppServices, KServices>) => Router
          : (
                services: Pick<AppServices, KServices>,
                limiters: Pick<AppMiddleware, KLimiters>,
            ) => Router
      : (
            services: Pick<AppServices, KServices>,
            limiters: Pick<AppMiddleware, KLimiters>,
            config: TConfig,
        ) => Router;
