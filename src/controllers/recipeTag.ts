import type { ContentTag } from "../database/definitions/contentTag.ts";
import type { Recipe, CreateQuery } from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";
import { ContentTagActions } from "./content/contentTag.ts";

type SaveRecipeTagRequest = CreateQuery<{
    recipeId: Recipe["recipeId"];
    tags: Array<Pick<ContentTag, "tagId">>;
}>;

type ReadRecipeTagsRequest = CreateQuery<{
    recipeId: Recipe["recipeId"];
}>;

export const RecipeTagActions = {
    readByRecipeId: (request: ReadRecipeTagsRequest) =>
        ContentTagActions.readByContentId(EnsureArray(request).map(({ recipeId }) => recipeId)).then(response =>
            response.map(({ contentId, ...rest }) => ({ recipeId: contentId, ...rest }))
        ),
    save: (request: SaveRecipeTagRequest) =>
        ContentTagActions.save(EnsureArray(request).map(({ recipeId, tags }) => ({ contentId: recipeId, tags }))),
};

export type RecipeTagActions = typeof RecipeTagActions;
