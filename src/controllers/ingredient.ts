import { v4 as Uuid } from "uuid";

import {
    type CreateQuery,
    type CreateResponse,
    type Ingredient,
    type KnexDatabase,
    PAGE_SIZE,
    type QueryServiceDi,
    type ReadQuery,
    type ReadResponse,
    type User,
    ingredient,
    lamington,
} from "../database/index.ts";
import { EnsureArray, Undefined } from "../utils/index.ts";
import { processPagination } from "./helpers/index.ts";
import { content, type Content } from "../database/definitions/content.ts";

/**
 * Get all ingredients
 * @returns an array of all ingredients in the database
 */
const query: QueryServiceDi<Ingredient> = async (db: KnexDatabase, { page = 1, search }) => {
    const ingredientsList = await db<Ingredient>(lamington.ingredient)
        .select("ingredientId", "name", "description", content.createdBy)
        .where(builder => (search ? builder.where("name", "ILIKE", `%${search}%`) : undefined))
        .join(lamington.content, content.contentId, ingredient.ingredientId)
        .orderBy([{ column: ingredient.name, order: "asc" }, "ingredientId"])
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);

    return processPagination(ingredientsList, page);
};

/**
 * Get all ingredients
 * @returns an array of all ingredients in the database
 */
const queryByUser: QueryServiceDi<Ingredient, Pick<User, "userId">> = async (
    db: KnexDatabase,
    { page = 1, search, userId }
) => {
    const ingredientsList = await db<Ingredient>(lamington.ingredient)
        .select(ingredient.ingredientId, ingredient.name, ingredient.description, content.createdBy)
        .where({ [content.createdBy]: userId })
        .where(builder => (search ? builder.where(ingredient.name, "ILIKE", `%${search}%`) : undefined))
        .leftJoin(lamington.content, ingredient.ingredientId, content.contentId)
        .orderBy([{ column: ingredient.name, order: "asc" }, ingredient.ingredientId])
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);

    return processPagination(ingredientsList, page);
};

interface GetIngredientParams {
    id: string;
}

/**
 * Get ingredients by id or ids
 * @returns an array of ingredients matching given ids
 */
export const readIngredients = async (
    db: KnexDatabase,
    params: ReadQuery<GetIngredientParams>
): ReadResponse<Ingredient> => {
    const ingredientIds = EnsureArray(params).map(({ id }) => id);

    return db<Ingredient>(lamington.ingredient).select("*").whereIn(ingredient.ingredientId, ingredientIds);
};

/**
 * Creates a new ingredient from params
 * @returns the newly created ingredients
 */
const save = async (
    db: KnexDatabase,
    params: CreateQuery<Partial<Ingredient & { createdBy: Content["createdBy"] }>>
): CreateResponse<Pick<Ingredient, "ingredientId">> => {
    const data: Ingredient[] = EnsureArray(params)
        .map(({ ingredientId = Uuid(), name, description }) => {
            if (!name) return;
            return { ingredientId, name, description };
        })
        .filter(Undefined);

    if (data.length === 0) return [];

    await db<Content>(lamington.content)
        .insert(
            EnsureArray(params).map(({ ingredientId, createdBy }) => ({
                contentId: ingredientId,
                createdBy,
            }))
        )
        .onConflict("contentId")
        .merge();

    return db<Ingredient>(lamington.ingredient)
        .insert(data)
        .onConflict("ingredientId")
        .ignore()
        .returning("ingredientId");
};

export const IngredientActions = {
    query,
    queryByUser,
    save,
};

export type IngredientActions = typeof IngredientActions;
