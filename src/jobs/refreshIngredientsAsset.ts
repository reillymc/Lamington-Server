import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppRepositories, Database } from "../repositories/index.ts";
import type { Logger } from "../utils/logger.ts";
import type { CreateJob } from "./job.ts";

interface CreateRefreshIngredientsAssetJobParams {
    database: Database;
    repositories: Pick<AppRepositories, "ingredientRepository">;
    assetDirectory: string;
    logger: Logger;
}

export const createRefreshIngredientsAssetJob: CreateJob<
    CreateRefreshIngredientsAssetJobParams
> = ({ database, repositories, assetDirectory, logger }) => ({
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
