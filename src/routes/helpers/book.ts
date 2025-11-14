import { v4 as Uuid } from "uuid";

import { BookActions, type BookMemberActions } from "../../controllers/index.ts";
import type { RecipeService } from "../../controllers/spec/index.ts";
import { BisectOnValidPartialItems, EnsureDefinedArray } from "../../utils/index.ts";
import type { Book, PostBookRequestBody, RequestValidator } from "../spec/index.ts";
import { RecipeQueryResponseToRecipe } from "./recipe.ts";
import { getStatus } from "./user.ts";

const DefaultBookColor = "variant1";
const DefaultBookIcon = "variant1";

export const validatePostBookBody: RequestValidator<PostBookRequestBody> = ({ data }, userId) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidPartialItems(filteredData, item => {
        if (!item.name) return;

        return {
            bookId: item.bookId ?? Uuid(),
            name: item.name,
            description: item.description,
            customisations: { color: item.color ?? DefaultBookColor, icon: item.icon ?? DefaultBookIcon },
            members: item.members,
            createdBy: userId,
        };
    });
};

type BookResponse = Awaited<ReturnType<BookActions["read"]>>[number];
type RecipesResponse = Awaited<ReturnType<RecipeService["QueryByBook"]>>["result"];
type MembersResponse = Awaited<ReturnType<BookMemberActions["read"]>>;

export const prepareGetBookResponseBody = (
    book: BookResponse,
    userId: string,
    recipes?: RecipesResponse,
    members?: MembersResponse
): Book => ({
    bookId: book.bookId,
    name: book.name,
    description: book.description,
    ...book.customisations,
    createdBy: { userId: book.createdBy, firstName: book.createdByName },
    recipes: recipes
        ? Object.fromEntries(recipes.map(recipe => [recipe.recipeId, RecipeQueryResponseToRecipe(recipe)]))
        : undefined,
    members: members
        ? Object.fromEntries(
              members.map(({ userId, status, firstName, lastName }) => [
                  userId,
                  { userId, status: getStatus(status), firstName, lastName },
              ])
          )
        : undefined,
    status: getStatus(book.status, book.createdBy === userId),
});
