import type { Router } from "express";
import type { AppDependencies } from "../appDependencies.ts";

export type CreateRoute<KServices extends keyof AppDependencies["services"]> = (
    services: Pick<AppDependencies["services"], KServices>
) => Router;
