import { content, type Content } from "../../src/database/definitions/content.ts";
import db, {
    type List,
    type ListItemIngredientAmount,
    type ReadResponse,
    lamington,
    list,
} from "../../src/database/index.ts";
import { randomNumber } from "./data.ts";

export const readAllLists = async (): ReadResponse<List & { createdBy: Content["createdBy"] }> => {
    const query = db<List & { createdBy: Content["createdBy"] }>(lamington.list)
        .select(list.listId, list.name, content.createdBy)
        .leftJoin(lamington.content, content.contentId, list.listId);
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
