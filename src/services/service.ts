import type { AppRepositories, Database } from "../repositories/index.ts";

export type CreateService<T, KRepositories extends keyof AppRepositories> = (
    database: Database,
    repositories: Pick<AppRepositories, KRepositories>,
) => T;
