import { v4 as uuid } from "uuid";

import { IngredientActions, ListActions, UserActions } from "../../src/controllers/index.ts";
import { type ListService } from "../../src/controllers/spec/index.ts";
import db, {
    type KnexDatabase,
    type ServiceParams,
    type ServiceParamsDi,
    lamington,
} from "../../src/database/index.ts";
import { UserStatus } from "../../src/routes/spec/index.ts";
import { hashPassword } from "../../src/services/index.ts";
import { randomCount } from "./data.ts";
import { KnexBookRepository } from "../../src/repositories/knex/bookRepository.ts";

export const CreateUsers = async (
    database: KnexDatabase,
    { count = 1, status = UserStatus.Member }: { count?: number; status?: UserStatus } = {}
) => {
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

    await UserActions.save(database, hashedUsers);

    return users;
};

type Table = `${(typeof lamington)[keyof lamington]}`;

export const CleanAllTables = async () => await CleanTables(...Object.values(lamington));

export const CleanTables = async (...tables: Table[]) => {
    if (tables.includes(lamington.contentNote)) await db.table(lamington.contentNote).del();
    if (tables.includes(lamington.contentTag)) await db.table(lamington.contentTag).del();
    if (tables.includes(lamington.contentMember)) await db.table(lamington.contentMember).del();
    if (tables.includes(lamington.contentAttachment)) await db.table(lamington.contentAttachment).del();

    if (tables.includes(lamington.recipeIngredient)) await db.table(lamington.recipeIngredient).del();
    if (tables.includes(lamington.recipeRating)) await db.table(lamington.recipeRating).del();
    if (tables.includes(lamington.recipeSection)) await db.table(lamington.recipeSection).del();
    if (tables.includes(lamington.recipeStep)) await db.table(lamington.recipeStep).del();

    if (tables.includes(lamington.listItem)) await db.table(lamington.listItem).del();

    if (tables.includes(lamington.plannerMeal)) await db.table(lamington.plannerMeal).del();

    if (tables.includes(lamington.bookRecipe)) await db.table(lamington.bookRecipe).del();

    if (tables.includes(lamington.ingredient)) await db.table(lamington.ingredient).del();
    if (tables.includes(lamington.recipe)) await db.table(lamington.recipe).del();
    if (tables.includes(lamington.list)) await db.table(lamington.list).del();
    if (tables.includes(lamington.planner)) await db.table(lamington.planner).del();
    if (tables.includes(lamington.book)) await db.table(lamington.book).del();
    if (tables.includes(lamington.tag)) await db.table(lamington.tag).del();
    if (tables.includes(lamington.user)) await db.table(lamington.user).del();
    if (tables.includes(lamington.content)) await db.table(lamington.content).del();
};

export const CreateBooks = async (
    database: KnexDatabase,
    { count = randomCount, userId }: { count?: number; userId: string }
) => {
    const { books } = await KnexBookRepository.create(database, {
        userId: userId,
        books: Array.from({ length: count }, () => ({
            bookId: uuid(),
            description: uuid(),
            name: uuid(),
        })),
    });

    return [books, count] as const;
};

export const CreateLists = async ({
    count = randomCount,
    createdBy,
}: {
    count?: number;
    createdBy: string;
}): Promise<[ServiceParams<ListService, "Save">[], number]> => {
    const lists = Array.from({ length: count }, () => ({
        listId: uuid(),
        createdBy,
        description: uuid(),
        name: uuid(),
        members: [],
    })) satisfies ServiceParams<ListService, "Save">[];

    await ListActions.Save(lists);

    return [lists, count];
};

export const CreateIngredients = async ({
    count = randomCount,
    createdBy,
}: {
    count?: number;
    createdBy: string | string[];
}) => {
    const ingredients = Array.from({ length: count }, () => ({
        ingredientId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: Array.isArray(createdBy) ? createdBy[Math.floor(Math.random() * createdBy.length)] : createdBy,
    })) satisfies ServiceParamsDi<IngredientActions, "save">[];

    await IngredientActions.save(db as KnexDatabase, ingredients);

    return [ingredients, count] as const;
};
