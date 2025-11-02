import { v4 as Uuid } from "uuid";

import db, {
    type CreateQuery,
    type CreateResponse,
    type Ingredient,
    PAGE_SIZE,
    type QueryService,
    type ReadQuery,
    type ReadResponse,
    type User,
    ingredient,
    lamington,
} from "../database/index.ts";
import { EnsureArray, Undefined } from "../utils/index.ts";
import { processPagination } from "./helpers/index.ts";

/**
 * Get all ingredients
 * @returns an array of all ingredients in the database
 */
const query: QueryService<Ingredient> = async ({ page = 1, search }) => {
    const ingredientsList = await db<Ingredient>(lamington.ingredient)
        .select("ingredientId", "name", "photo", "description", "createdBy")
        .where(builder => (search ? builder.where("name", "ILIKE", `%${search}%`) : undefined))
        .orderBy([{ column: ingredient.name, order: "asc" }, "ingredientId"])
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);

    return processPagination(ingredientsList, page);
};

/**
 * Get all ingredients
 * @returns an array of all ingredients in the database
 */
const queryByUser: QueryService<Ingredient, Pick<User, "userId">> = async ({ page = 1, search, userId }) => {
    const ingredientsList = await db<Ingredient>(lamington.ingredient)
        .select(
            ingredient.ingredientId,
            ingredient.name,
            ingredient.photo,
            ingredient.description,
            ingredient.createdBy
        )
        .where({ [ingredient.createdBy]: userId })
        .where(builder => (search ? builder.where(ingredient.name, "ILIKE", `%${search}%`) : undefined))
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
export const readIngredients = async (params: ReadQuery<GetIngredientParams>): ReadResponse<Ingredient> => {
    const ingredientIds = EnsureArray(params).map(({ id }) => id);

    return db<Ingredient>(lamington.ingredient).select("*").whereIn(ingredient.ingredientId, ingredientIds);
};

/**
 * Creates a new ingredient from params
 * @returns the newly created ingredients
 */
const save = async (params: CreateQuery<Partial<Ingredient>>): CreateResponse<Pick<Ingredient, "ingredientId">> => {
    const data: Ingredient[] = EnsureArray(params)
        .map(({ ingredientId = Uuid(), name, description, photo, createdBy }) => {
            if (!name || !createdBy) return;
            return { ingredientId, name, description, photo, createdBy };
        })
        .filter(Undefined);

    if (data.length === 0) return [];

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
