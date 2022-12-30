// API Specs
import { RecipeTags } from "../../routes/spec";

// DB Specs
import { RecipeTag } from "../../database";
import { TagReadByRecipeIdResults } from "../recipeTag";

export const recipeTagRowsToResponse = (tags: TagReadByRecipeIdResults): RecipeTags => {
    const responseData: RecipeTags = tags.map(tag => ({
        tagId: tag.tagId,
        name: tag.name,
    }));
    return responseData;
};

export const recipeTagsRequestToRows = (recipeId: string, tags: RecipeTags = []): RecipeTag[] =>
    tags.map(({ tagId }) => ({
        recipeId,
        tagId,
    }));
