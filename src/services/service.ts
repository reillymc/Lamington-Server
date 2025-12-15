import type { Database } from "../database/index.ts";
import type { AppRepositories } from "../repositories/index.ts";

export type CreateService<T, KRepositories extends keyof AppRepositories> = (
    database: Database,
    {}: Pick<AppRepositories, KRepositories>
) => T;
