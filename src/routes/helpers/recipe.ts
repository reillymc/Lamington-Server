import { v4 as Uuid } from "uuid";

import { DefaultSection, QueryMetadata, ServiceParams, ServiceResponse } from "../../database";
import { BisectOnValidItems, EnsureDefinedArray, ObjectFromEntries, Undefined } from "../../utils";
import {
    PostRecipeRequestBody,
    QueryParam,
    Recipe,
    RecipeIngredientAmount,
    RecipeIngredients,
    RecipeMethod,
    RecipeTags,
} from "../spec";
import { RecipeService } from "../../controllers/spec";

import { parseBaseQuery } from "./queryParams";

type ToQueryParams<T extends Record<string, any>> = {
    [K in keyof T]: QueryParam;
};

type ToQueryMetadata<T extends QueryMetadata<any>> = T & QueryMetadata<NonNullable<T["sort"]>>;

type QueryParams = Omit<ServiceParams<RecipeService, "Query">, "userId">;

const parseAmount = (amountJSON: string | undefined) => {
    if (!amountJSON) return;

    try {
        const amount = JSON.parse(amountJSON) as RecipeIngredientAmount;

        if (!["number", "fraction", "range"].includes(amount.representation)) return;

        return amount;
    } catch {
        return;
    }
};

const stringifyAmount = (amount: RecipeIngredientAmount | undefined) => {
    if (!amount) return;

    switch (amount.representation) {
        case "number":
            if (typeof amount.value !== "number") return JSON.stringify(amount);
        case "fraction":
        case "range":
            if (
                Array.isArray(amount.value) &&
                amount.value.length === 2 &&
                amount.value.every(v => typeof v === "number")
            )
                return JSON.stringify(amount);
    }
};

const parseRecipesQuerySort = (sort: QueryParam) => {
    if (Array.isArray(sort)) return;
    if (sort === undefined) return;

    switch (sort) {
        case "name":
            return "name";
        case "ratingPersonal":
            return "ratingPersonal";
        case "ratingAverage":
            return "ratingAverage";
        case "time":
            return "time";
    }
};

export const parseRecipeQuery = ({
    sort: rawSort,
    ingredients: rawIngredients,
    order: rawOrder,
    page: rawPage,
    search: rawSearch,
    ...baseParams
}: ToQueryParams<QueryParams>): ToQueryMetadata<
    Omit<QueryParams, "categories"> & { categoryGroups?: Record<string, string[]> }
> => {
    const { page, search, order } = parseBaseQuery({ page: rawPage, search: rawSearch, order: rawOrder });
    const sort = parseRecipesQuerySort(rawSort);

    const categoryGroups: Record<string, string[]> = Object.entries(baseParams).reduce((acc, [key, value]) => {
        if (value === undefined) return acc;
        const val = (Array.isArray(value) ? value : [value]).filter(Undefined);

        if (!val.every((v): v is string => typeof v === "string")) return acc;

        return { ...acc, [key]: val };
    }, {} as Record<string, string[]>);
    const ingredients = (Array.isArray(rawIngredients) ? rawIngredients : [rawIngredients]).filter(Undefined);

    return { page, search, sort, order, categoryGroups, ingredients };
};

export const validatePostRecipeBody = ({ data }: PostRecipeRequestBody, userId: string) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ recipeId = Uuid(), name, ...item }) => {
        if (!name) return;

        const validItem: ServiceParams<RecipeService, "Save"> = {
            cookTime: item.cookTime,
            prepTime: item.prepTime,
            servingsLower: item.servingsLower,
            servingsUpper: item.servingsUpper,
            ingredients: item.ingredients?.map(({ items, ...section }) => ({
                ...section,
                items: items
                    .map(({ amount, ...item }) => {
                        return {
                            ...item,
                            amount: stringifyAmount(amount),
                        };
                    })
                    .filter(Undefined),
            })),
            method: item.method,
            tips: item.tips,
            photo: item.photo,
            public: item.public ? 1 : 0,
            source: item.source,
            tags: item.tags,
            summary: item.summary,
            timesCooked: item.timesCooked,
            ratingPersonal: item.ratingPersonal,
            recipeId,
            name,
            createdBy: userId,
        };

        return validItem;
    });
};

const recipeIngredientRowsToResponse = ({
    sections,
    ingredients,
}: ServiceResponse<RecipeService, "Read">): RecipeIngredients => {
    const recipeIngredients: RecipeIngredients = sections
        .sort((a, b) => (a.name === DefaultSection ? -1 : a.index - b.index))
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: ingredients
                .filter(ingredient => ingredient.sectionId === sectionId)
                .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
                .map(({ amount, ...ingredient }) => ({
                    ...ingredient,
                    amount: amount ? parseAmount(amount) : undefined,
                })),
        }))
        .filter(({ items, name }) => (name === DefaultSection ? true : items.length));

    return recipeIngredients;
};

const recipeStepRowsToResponse = ({ sections, method }: ServiceResponse<RecipeService, "Read">): RecipeMethod => {
    const recipeMethod: RecipeMethod = sections
        .sort((a, b) => (a.name === DefaultSection ? -1 : a.index - b.index))
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: method
                .filter(method => method.sectionId === sectionId)
                .sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
        }))
        .filter(({ items, name }) => (name === DefaultSection ? true : items.length));

    return recipeMethod;
};

const recipeTagRowsToResponse = ({
    tags,
}: ServiceResponse<RecipeService, "Read"> | ServiceResponse<RecipeService, "Query">): RecipeTags => {
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

export const RecipeReadResponseToRecipe = (recipe: ServiceResponse<RecipeService, "Read">): Recipe => ({
    ...recipe,
    ingredients: recipeIngredientRowsToResponse(recipe),
    method: recipeStepRowsToResponse(recipe),
    tags: recipeTagRowsToResponse(recipe),
    createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
    public: !!recipe.public,
});

export const RecipeQueryResponseToRecipe = (
    recipe:
        | ServiceResponse<RecipeService, "Query">
        | ServiceResponse<RecipeService, "QueryByUser">
        | ServiceResponse<RecipeService, "QueryByBook">
): Recipe => ({
    ...recipe,
    createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
    tags: recipeTagRowsToResponse(recipe),
    public: !!recipe.public,
});
