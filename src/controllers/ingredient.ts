import { v4 as Uuid } from "uuid";

import { Undefined } from "../utils";
import db, {
    CreateResponse,
    ReadResponse,
    ingredient,
    Ingredient,
    lamington,
    ReadQuery,
    CreateQuery,
    QueryService,
    PAGE_SIZE,
    User,
} from "../database";
import { processPagination } from "./helpers";

/**
 * Get all ingredients
 * @returns an array of all ingredients in the database
 */
const query: QueryService<Ingredient> = async ({ page = 1, search }) => {
    const ingredientsList = await db<Ingredient>(lamington.ingredient)
        .select(
            ingredient.ingredientId,
            ingredient.name,
            ingredient.photo,
            ingredient.description,
            ingredient.createdBy
        )
        .where(builder => (search ? builder.where(ingredient.name, "like", `%${search}%`) : undefined))
        .orderBy([{ column: ingredient.name, order: "asc" }, ingredient.ingredientId])
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
        .where(builder => (search ? builder.where(ingredient.name, "like", `%${search}%`) : undefined))
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
    if (!Array.isArray(params)) {
        params = [params];
    }
    const ingredientIds = params.map(({ id }) => id);

    const query = db<Ingredient>(lamington.ingredient).select("*").whereIn(ingredient.ingredientId, ingredientIds);
    return query;
};

/**
 * Creates a new ingredient from params
 * @returns the newly created ingredients
 */
const save = async (ingredients: CreateQuery<Partial<Ingredient>>): CreateResponse<Ingredient> => {
    if (!Array.isArray(ingredients)) {
        ingredients = [ingredients];
    }
    const data: Ingredient[] = ingredients
        .map(({ ingredientId = Uuid(), name, description, photo, createdBy }) => {
            if (!name || !createdBy) return;
            return { ingredientId, name, description, photo, createdBy };
        })
        .filter(Undefined);

    if (data.length === 0) return [];

    await db(lamington.ingredient).insert(data).onConflict([ingredient.ingredientId]).ignore();

    const ingredientIds = data.map(({ ingredientId }) => ingredientId);

    return db<Ingredient>(lamington.ingredient).select("*").whereIn(ingredient.ingredientId, ingredientIds);
};

export const IngredientActions = {
    query,
    queryByUser,
    save,
};

export type IngredientActions = typeof IngredientActions;
