import { RecipeActions } from "../../controllers";
import { QueryMetadata, ServiceParams } from "../../database";
import { Undefined } from "../../utils";
import { QueryParam } from "../spec";

import { parseBaseQuery } from "./queryParams";

type ToQueryParams<T extends Record<string, any>> = {
    [K in keyof T]: QueryParam;
};

type ToQueryMetadata<T extends QueryMetadata<any>> = T & QueryMetadata<NonNullable<T["sort"]>>;

type QueryParams = Omit<ServiceParams<RecipeActions, "query">, "userId">;

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
