import { QueryMetadata } from "../../database";
import { QueryParam, BasePaginatedRequestQuery } from "../spec";

const parsePage = (page: QueryParam) => {
    if (Array.isArray(page)) return;
    if (page === undefined) return;
    return parseInt(page ?? "1", 10);
};

const parseSearch = (search: QueryParam) => {
    if (Array.isArray(search)) return;
    return search;
};

const parseSort = (sort: QueryParam) => {
    if (Array.isArray(sort)) return;
    if (sort === undefined) return;

    switch (sort) {
        case "name":
            return "name";
        case "date":
            return "date";
    }
};

export const parseBaseQuery = ({
    page: rawPage,
    search: rawSearch,
    sort: rawSort,
    order: rawOrder,
}: BasePaginatedRequestQuery): QueryMetadata => {
    const page = parsePage(rawPage);
    const search = parseSearch(rawSearch);
    const sort = parseSort(rawSort);
    const order = rawOrder === "asc" ? "asc" : "desc";

    return { page, search, sort, order };
};
