// API Specs
import { RecipeTags, Tag } from "../../routes/spec";

// DB Specs
import { RecipeTag } from "../../database";
import { TagReadByRecipeIdResults } from "../recipeTag";
import { ObjectFromEntries, Undefined } from "../../utils";

export const recipeTagRowsToResponse = (tags: TagReadByRecipeIdResults): RecipeTags => {
    const groupedTags: RecipeTags = tags.reduce((acc, { tagId, parentId, name }) => {
        if (parentId) {
            acc[parentId] = {
                ...acc[parentId],
                tagId: parentId,
                tags: [...(acc[parentId]?.tags ?? []), { tagId, name }],
            };
        } else {
            acc[tagId] = {
                ...acc[tagId],
                tagId,
                name,
            };
        }
        return acc;
    }, {} as RecipeTags);

    return ObjectFromEntries(
        groupedTags,
        data =>
            data.map(([id, value]) => (value.tags?.length ? [id, value] : undefined)).filter(Undefined) as unknown as [
                string,
                RecipeTags
            ][]
    );
};

export const recipeTagsRequestToRows = (recipeId: string, tags: RecipeTags = {}): RecipeTag[] =>
    Object.values(tags)
        .flatMap(({ tags }) =>
            tags?.map(({ tagId }) => ({
                recipeId,
                tagId,
            }))
        )
        .filter(Undefined);
