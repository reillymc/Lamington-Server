import { PAGE_SIZE } from "../../database";

export * from "./ingredient";
export * from "./recipeIngredient";
export * from "./recipeSection";
export * from "./recipeStep";
export * from "./recipeTag";

export const processPagination = <T>(result: T[], page: number) => {
    let nextPage: number | undefined;
    if (result.length > PAGE_SIZE) {
        nextPage = page + 1;
        result.pop();
    }

    return { result, nextPage };
};
