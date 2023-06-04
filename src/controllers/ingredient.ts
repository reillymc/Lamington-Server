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
} from "../database";

/**
 * Get all ingredients
 * @returns an array of all ingredients in the database
 */
const readAll = async (): ReadResponse<Ingredient> => {
    const query = db<Ingredient>(lamington.ingredient).select("*");
    return query;
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

    const result = await db(lamington.ingredient).insert(data).onConflict([ingredient.ingredientId]).ignore();

    const ingredientIds = data.map(({ ingredientId }) => ingredientId);

    const query = db<Ingredient>(lamington.ingredient).select("*").whereIn(ingredient.ingredientId, ingredientIds);
    return query;
};

export const IngredientActions = {
    readAll,
    save,
};
