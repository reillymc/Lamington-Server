import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppRepositories } from "../repositories/index.ts";
import type { Logger } from "../utils/logger.ts";
import { createJob } from "./job.ts";

interface CreateRefreshIngredientsAssetJobConfig {
    repositories: Pick<AppRepositories, "ingredientRepository">;
    assetDirectory: string;
    logger: Logger;
}

export const createRefreshIngredientsAssetJob = createJob<
    [],
    CreateRefreshIngredientsAssetJobConfig
>(({ repositories, assetDirectory, logger }) => ({
    run: async () => {
        try {
            const { ingredients } =
                await repositories.ingredientRepository.readAll({});

            const filePath = path.join(assetDirectory, "ingredients.json");

            if (!existsSync(assetDirectory)) {
                await mkdir(assetDirectory, { recursive: true });
            }

            await writeFile(filePath, JSON.stringify(ingredients));

            return true;
        } catch (error) {
            logger.error("Failed to refresh ingredients asset file", error);
            throw error;
        }
    },
    trigger: ["startup"],
}));
