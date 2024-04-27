import db, { List, ReadResponse, lamington, list } from "../../src/database";
import { ListItemIngredientAmount } from "../../src/routes/spec";
import { randomNumber } from "./data";

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
