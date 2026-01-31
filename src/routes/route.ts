import type { Router } from "express";
import type { AppDependencies } from "../appDependencies.ts";

export type CreateRouter<KServices extends keyof AppDependencies = never> = (
    services: Pick<AppDependencies, KServices>,
) => Router;
