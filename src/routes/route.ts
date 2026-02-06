import type { Router } from "express";
import type { AppDependencies } from "../appDependencies.ts";

export type CreateRouter<
    KServices extends keyof AppDependencies["services"] = never,
    KLimiters extends keyof AppDependencies["middleware"] = never,
> = [KServices] extends [never]
    ? () => Router
    : [KLimiters] extends [never]
      ? (services: Pick<AppDependencies["services"], KServices>) => Router
      : (
            services: Pick<AppDependencies["services"], KServices>,
            limiters: Pick<AppDependencies["middleware"], KLimiters>,
        ) => Router;
