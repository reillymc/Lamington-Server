import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppRepositories, Database } from "../repositories/index.ts";
import type { Logger } from "../utils/logger.ts";
import type { Job } from "./job.ts";

interface CreateRefreshIngredientsAssetJobParams<
    TDatabase extends Database = Database,
> {
    database: TDatabase;
    repositories: Pick<AppRepositories<TDatabase>, "ingredientRepository">;
    assetDirectory: string;
    logger: Logger;
}

export const createRefreshIngredientsAssetJob = <
    TDatabase extends Database = Database,
>({
    database,
    repositories,
    assetDirectory,
    logger,
}: CreateRefreshIngredientsAssetJobParams<TDatabase>): Job => ({
    run: async () => {
        try {
            const { ingredients } =
                await repositories.ingredientRepository.readAll(database, {});

            const filePath = path.join(assetDirectory, "ingredients.json");

            if (!existsSync(assetDirectory)) {
                await mkdir(assetDirectory, { recursive: true });
            }

            await writeFile(filePath, JSON.stringify(ingredients));

            return true;
        } catch (error) {
            logger.error("Failed to refresh ingredients asset file", error);
            return false;
        }
    },
    trigger: ["startup"],
});
