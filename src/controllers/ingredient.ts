import { v4 as Uuid } from "uuid";

import db, {
    CreateResponse,
    ReadResponse,
    ingredient,
    Ingredient,
    lamington,
    ReadQuery,
    CreateQuery,
} from "../database";
import { Undefined } from "../utils";

/**
 * Get all ingredients
 * @returns an array of all ingredients in the database
 */
const readAllIngredients = async (): ReadResponse<Ingredient> => {
    const query = db<Ingredient>(lamington.ingredient).select("*");
    return query;
};

export interface GetIngredientParams {
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

export interface CreateIngredientParams {
    ingredientId?: string;
    name?: string;
    namePlural?: string;
    description?: string;
    photo?: string;
}

/**
 * Creates a new ingredient from params
 * @returns the newly created ingredients
 */
const createIngredients = async (ingredients: CreateQuery<CreateIngredientParams>): CreateResponse<Ingredient> => {
    if (!Array.isArray(ingredients)) {
        ingredients = [ingredients];
    }
    const data: Ingredient[] = ingredients
        .map(({ ingredientId = Uuid(), name, namePlural, description, photo }) => {
            if (!name) return;
            return { ingredientId, name, namePlural, description, photo };
        })
        .filter(Undefined);

    const result = await db(lamington.ingredient)
        .insert(data)
        .onConflict([ingredient.ingredientId, ingredient.name])
        .ignore();

    const ingredientIds = data.map(({ ingredientId }) => ingredientId);

    const query = db<Ingredient>(lamington.ingredient).select("*").whereIn(ingredient.ingredientId, ingredientIds);
    return query;
};

const IngredientActions = {
    readAllIngredients,
    createIngredients,
};

export default IngredientActions;

export { readAllIngredients, createIngredients };
