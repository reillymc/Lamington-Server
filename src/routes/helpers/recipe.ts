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
        case "rating":
            return "rating";
        case "time":
            return "time";
    }
};

export const parseRecipeQuery = ({
    sort: rawSort,
    categories: rawCategories,
    ...baseParams
}: ToQueryParams<QueryParams>): ToQueryMetadata<QueryParams> => {
    const { page, search, order } = parseBaseQuery(baseParams);
    const sort = parseRecipesQuerySort(rawSort);
    const categories = (Array.isArray(rawCategories) ? rawCategories : [rawCategories]).filter(Undefined);

    return { page, search, sort, order, categories };
};
