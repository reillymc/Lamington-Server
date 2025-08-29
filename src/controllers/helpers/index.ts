import { PAGE_SIZE } from "../../database/index.ts";

export * from "./ingredient.ts";
export * from "./recipeIngredient.ts";
export * from "./recipeSection.ts";
export * from "./recipeStep.ts";
export * from "./recipeTag.ts";

export const processPagination = <T>(result: T[], page: number) => {
    let nextPage: number | undefined;
    if (result.length > PAGE_SIZE) {
        nextPage = page + 1;
        result.pop();
    }

    return { result, nextPage };
};
