import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppRepositories, Database } from "../repositories/index.ts";

export const extractIngredientsAssetFile = async (
    database: Database,
    { ingredientRepository }: Pick<AppRepositories, "ingredientRepository">,
    assetsDir: string,
) => {
    const { ingredients } = await ingredientRepository.readAll(database, {
        userId: null,
    });

    if (!existsSync(assetsDir)) {
        await mkdir(assetsDir);
    }

    await writeFile(
        path.join(assetsDir, "ingredients.json"),
        JSON.stringify(ingredients),
    );
};
