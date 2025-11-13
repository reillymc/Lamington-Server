import { v4 as Uuid } from "uuid";

import type { RecipeService } from "../../controllers/spec/index.ts";
import { DefaultSection, type QueryMetadata, type ServiceParams, type ServiceResponse } from "../../database/index.ts";
import { BisectOnValidItems, EnsureDefinedArray, ObjectFromEntries, Undefined } from "../../utils/index.ts";
import type {
    PostRecipeRequestBody,
    QueryParam,
    Recipe,
    RecipeIngredientAmount,
    RecipeIngredients,
    RecipeMethod,
    RecipeServings,
    ContentTags,
} from "../spec/index.ts";

import { parseBaseQuery } from "./queryParams.ts";

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
            if (typeof amount.value === "string") return JSON.stringify(amount);
        case "fraction":
            if (
                Array.isArray(amount.value) &&
                amount.value.length === 3 &&
                amount.value.every(v => typeof v === "string")
            )
                return JSON.stringify(amount);
        case "range":
            if (
                Array.isArray(amount.value) &&
                amount.value.length === 2 &&
                amount.value.every(v => typeof v === "string")
            )
                return JSON.stringify(amount);
    }
};

const parseServings = (servingsString: string | undefined) => {
    if (!servingsString) return;

    try {
        const servings = JSON.parse(servingsString) as RecipeServings;

        if (!Object.keys(servings).includes("unit") || !Object.keys(servings).includes("count")) return;
        if (!["number", "range"].includes(servings.count.representation)) return;

        return servings;
    } catch {
        return;
    }
};

const stringifyServings = (servings: RecipeServings | undefined) => {
    if (!servings) return;

    switch (servings.count.representation) {
        case "number":
            if (typeof servings.count.value !== "string") return;
            break;
        case "range":
            if (
                !Array.isArray(servings.count.value) ||
                servings.count.value.length !== 2 ||
                servings.count.value.some(v => typeof v !== "string")
            )
                return;
            break;
    }

    return JSON.stringify(servings);
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
            servings: item.servings,
            ingredients: item.ingredients,
            method: item.method?.map(methodSection => ({
                ...methodSection,
                items: methodSection.items.filter(step => !!step.description),
            })),
            tips: item.tips,
            public: item.public ?? false,
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
                .sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
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

const ContentTagRowsToResponse = ({
    tags,
}: ServiceResponse<RecipeService, "Read"> | ServiceResponse<RecipeService, "Query">): ContentTags => {
    const groupedTags: ContentTags = tags.reduce((acc, { tagId, parentId, name }) => {
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
    }, {} as ContentTags);

    return ObjectFromEntries(
        groupedTags,
        data =>
            data.map(([id, value]) => (value.tags?.length ? [id, value] : undefined)).filter(Undefined) as unknown as [
                string,
                ContentTags
            ][]
    );
};

export const RecipeReadResponseToRecipe = (recipe: ServiceResponse<RecipeService, "Read">): Recipe => {
    const heroAttachment = recipe.attachments.find(att => att.displayType === "hero");

    return {
        ...recipe,
        ingredients: recipeIngredientRowsToResponse(recipe),
        method: recipeStepRowsToResponse(recipe),
        tags: ContentTagRowsToResponse(recipe),
        createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
        public: !!recipe.public,
        attachments: {
            hero: heroAttachment,
        },
    };
};

export const RecipeQueryResponseToRecipe = (
    recipe:
        | ServiceResponse<RecipeService, "Query">
        | ServiceResponse<RecipeService, "QueryByUser">
        | ServiceResponse<RecipeService, "QueryByBook">
): Recipe => ({
    ...recipe,
    createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
    tags: ContentTagRowsToResponse(recipe),
    public: !!recipe.public,
});
