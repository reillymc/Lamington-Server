import { PAGE_SIZE } from "../../database/index.ts";

export * from "./contentTag.ts";

export const processPagination = <T>(result: T[], page: number) => {
    let nextPage: number | undefined;
    if (result.length > PAGE_SIZE) {
        nextPage = page + 1;
        result.pop();
    }

    return { result, nextPage };
};
