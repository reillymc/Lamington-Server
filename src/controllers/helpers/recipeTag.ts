import { RecipeTag } from "../../database";
import { Undefined } from "../../utils";
import { RecipeTags } from "../spec/recipe";

export const recipeTagsRequestToRows = (recipeId: string, tags: RecipeTags = {}): RecipeTag[] =>
    Object.values(tags)
        .flatMap(({ tags }) =>
            tags?.map(({ tagId }) => ({
                recipeId,
                tagId,
            }))
        )
        .filter(Undefined);
