import type { AppRepositories, Database } from "../repositories/index.ts";

export type CreateService<
    T,
    KRepositories extends keyof AppRepositories,
    TConfig extends Record<string, unknown> = never,
> = [TConfig] extends [never]
    ? (
          database: Database,
          repositories: Pick<AppRepositories, KRepositories>,
      ) => T
    : (
          database: Database,
          repositories: Pick<AppRepositories, KRepositories>,
          config: TConfig,
      ) => T;
