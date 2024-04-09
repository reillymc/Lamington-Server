import db, { List, ReadResponse, lamington, list } from "../../src/database";

export const readAllLists = async (): ReadResponse<List> => {
    const query = db<List>(lamington.list).select(list.listId, list.name, list.createdBy);
    return query;
};
