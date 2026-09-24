import type { Knex } from "knex";
import type { KnexDatabase } from "../../knex.ts";
import {
    BookRecipeTable,
    ContentTable,
    lamington,
    RecipeTable,
} from "../../spec/index.ts";
import { withContentPermissions } from "./withContentPermissions.ts";

/**
 *   Restricts a recipe query to the recipes a user may read: recipes they own,
 *   public recipes, and recipes contained in books they own or actively belong
 *   to (`O`/`A`/`M` members; pending and blocked members are excluded).
 */
export const withRecipeReadPermissions =
    (db: KnexDatabase, userId: string) =>
    <TRecord extends {}, TResult>(
        query: Knex.QueryBuilder<TRecord, TResult>,
    ) => {
        const bookRecipeIds = db(lamington.bookRecipe)
            .select(BookRecipeTable.recipeId)
            .leftJoin(
                lamington.content,
                ContentTable.contentId,
                BookRecipeTable.bookId,
            )
            .modify(
                withContentPermissions({
                    userId,
                    idColumn: BookRecipeTable.bookId,
                    statuses: ["O", "A", "M"],
                }),
            );

        query.where((builder) => {
            builder
                .where(ContentTable.createdBy, userId)
                .orWhere(RecipeTable.public, true)
                .orWhereIn(RecipeTable.recipeId, bookRecipeIds);
        });
    };
