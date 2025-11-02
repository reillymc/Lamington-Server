import type { RecipeTag } from "../../database/index.ts";
import { Undefined } from "../../utils/index.ts";
import type { RecipeTags } from "../spec/recipe.ts";

export const recipeTagsRequestToRows = (recipeId: string, tags: RecipeTags = {}): RecipeTag[] =>
    Object.values(tags)
        .flatMap(({ tags }) =>
            tags?.map(({ tagId }) => ({
                recipeId,
                tagId,
            }))
        )
        .filter(Undefined);
