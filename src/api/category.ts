import db, { Category, category } from "../database";
import { CreateQuery, CreateResponse, lamington, ReadQuery, ReadResponse } from "../database/definitions";
import { v4 as Uuid } from "uuid";

/**
 * Get all categories
 * @returns an array of all categories in the database
 */
export const getAllCategories = async (): ReadResponse<Category> => {
    const query = db<Category>(lamington.ingredient).select("*");
    return query;
};

export interface GetCategoryParams {
    id: string;
}

/**
 * Get categories by id or ids
 * @returns an array of categories matching given ids
 */
export const getCategories = async (params: ReadQuery<GetCategoryParams>): ReadResponse<Category> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const categoryIds = params.map(({ id }) => id);

    const query = db<Category>(lamington.category).select("*").whereIn(category.id, categoryIds);
    return query;
};

export interface CreateCategoryParams {
    name: string;
    type: string;
    notes?: string;
}

/**
 * Create categories
 * @param categories a list of category objects
 * @returns the list of newly created category ids
 */
const createCategories = async (categories: CreateQuery<CreateCategoryParams>): CreateResponse<Category> => {
    if (!Array.isArray(categories)) {
        categories = [categories];
    }
    const data: Category[] = categories.map(({ name, type, notes }) => ({ id: Uuid(), name, type, notes }));

    const result = await db(lamington.category).insert(data);

    const categoryIds = data.map(({ id }) => id);

    const query = db<Category>(lamington.category).select("*").whereIn(category.id, categoryIds);
    return query;
};

export { createCategories };
