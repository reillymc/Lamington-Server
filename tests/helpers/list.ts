import db, { type List, type ReadResponse, lamington, list } from "../../src/database/index.ts";
import { type ListItemIngredientAmount } from "../../src/routes/spec/index.ts";
import { randomNumber } from "./data.ts";

export const readAllLists = async (): ReadResponse<List> => {
    const query = db<List>(lamington.list).select(list.listId, list.name, list.createdBy);
    return query;
};

export const generateRandomAmount = [
    () =>
        ({
            representation: "number",
            value: randomNumber(1, 100).toString(),
        } satisfies ListItemIngredientAmount),
    () =>
        ({
            representation: "range",
            value: [randomNumber(1, 100).toString(), randomNumber(1, 100).toString()],
        } satisfies ListItemIngredientAmount),
    () =>
        ({
            representation: "fraction",
            value: [randomNumber(1, 100).toString(), randomNumber(1, 100).toString(), randomNumber(1, 100).toString()],
        } satisfies ListItemIngredientAmount),
][randomNumber(0, 2)]!;
