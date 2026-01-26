import type { Router } from "express";
import type { AppDependencies } from "../appDependencies.ts";

export type CreateRoute<
    KServices extends keyof AppDependencies["services"],
    KLimiters extends keyof AppDependencies["middleware"] = never,
> = [KLimiters] extends [never]
    ? (services: Pick<AppDependencies["services"], KServices>) => Router
    : (
          services: Pick<AppDependencies["services"], KServices>,
          limiters: Pick<AppDependencies["middleware"], KLimiters>,
      ) => Router;
