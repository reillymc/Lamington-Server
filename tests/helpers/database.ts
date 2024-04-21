import { v4 as uuid } from "uuid";

import { BookActions, IngredientActions, ListActions, UserActions } from "../../src/controllers";
import { ListService } from "../../src/controllers/spec";
import db, { ServiceParams, lamington } from "../../src/database";
import { UserStatus } from "../../src/routes/spec";
import { hashPassword } from "../../src/services";
import { randomCount } from "./data";

export const CreateUsers = async ({ count = 1, status = UserStatus.Member } = {}) => {
    const users = Array.from({ length: count }, (_, i) => ({
        userId: uuid(),
        email: uuid(),
        firstName: uuid(),
        lastName: uuid(),
        password: uuid(),
        status,
    }));

    const hashedUsers = await Promise.all(
        users.map(async user => ({
            ...user,
            password: await hashPassword(user.password),
        }))
    );

    await UserActions.save(hashedUsers);

    return users;
};

type Table = `${lamington}`;

export const CleanAllTables = async () => await CleanTables(...Object.values(lamington));

export const CleanTables = async (...tables: Table[]) => {
    if (tables.includes(lamington.recipeIngredient)) await db.table(lamington.recipeIngredient).del();
    if (tables.includes(lamington.recipeRating)) await db.table(lamington.recipeRating).del();
    if (tables.includes(lamington.recipeNote)) await db.table(lamington.recipeNote).del();
    if (tables.includes(lamington.recipeSection)) await db.table(lamington.recipeIngredient).del();
    if (tables.includes(lamington.recipeStep)) await db.table(lamington.recipeStep).del();
    if (tables.includes(lamington.tag)) await db.table(lamington.tag).del();

    if (tables.includes(lamington.listItem)) await db.table(lamington.listItem).del();
    if (tables.includes(lamington.listMember)) await db.table(lamington.listMember).del();

    if (tables.includes(lamington.plannerMeal)) await db.table(lamington.plannerMeal).del();
    if (tables.includes(lamington.plannerMember)) await db.table(lamington.plannerMember).del();

    if (tables.includes(lamington.bookRecipe)) await db.table(lamington.bookRecipe).del();
    if (tables.includes(lamington.bookMember)) await db.table(lamington.bookMember).del();

    if (tables.includes(lamington.ingredient)) await db.table(lamington.ingredient).del();
    if (tables.includes(lamington.recipe)) await db.table(lamington.recipe).del();
    if (tables.includes(lamington.list)) await db.table(lamington.list).del();
    if (tables.includes(lamington.planner)) await db.table(lamington.planner).del();
    if (tables.includes(lamington.book)) await db.table(lamington.book).del();
    if (tables.includes(lamington.tag)) await db.table(lamington.tag).del();
    if (tables.includes(lamington.user)) await db.table(lamington.user).del();
};

export const CreateBooks = async ({
    count = randomCount,
    createdBy,
}: {
    count?: number;
    createdBy: string;
}): Promise<[ServiceParams<BookActions, "save">[], number]> => {
    const books = Array.from({ length: count }, () => ({
        bookId: uuid(),
        createdBy,
        description: uuid(),
        name: uuid(),
        members: [],
    })) satisfies ServiceParams<BookActions, "save">[];

    await BookActions.save(books);

    return [books, count];
};

export const CreateLists = async ({
    count = randomCount,
    createdBy,
}: {
    count?: number;
    createdBy: string;
}): Promise<[ServiceParams<ListService, "Save">[], number]> => {
    const books = Array.from({ length: count }, () => ({
        listId: uuid(),
        createdBy,
        description: uuid(),
        name: uuid(),
        members: [],
    })) satisfies ServiceParams<ListService, "Save">[];

    await ListActions.Save(books);

    return [books, count];
};

export const CreateIngredients = async ({
    count = randomCount,
    createdBy,
}: {
    count?: number;
    createdBy: string | string[];
}): Promise<[ServiceParams<IngredientActions, "save">[], number]> => {
    const ingredients = Array.from({ length: count }, () => ({
        ingredientId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: Array.isArray(createdBy) ? createdBy[Math.floor(Math.random() * createdBy.length)] : createdBy,
    })) satisfies ServiceParams<IngredientActions, "save">[];

    await IngredientActions.save(ingredients);

    return [ingredients, count];
};
