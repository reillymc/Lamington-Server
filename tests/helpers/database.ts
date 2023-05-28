import { v4 as uuid } from "uuid";

import { BookActions, UserActions } from "../../src/controllers";
import { UserStatus } from "../../src/routes/spec";
import { lamington } from "../../src/database";
import { hashPassword } from "../../src/services";
import db from "../../src/database/config";
import { CreateBookParams } from "../../src/controllers/book";
import { randomCount } from "./data";

export const CreateUsers = async ({ count = 1, status = UserStatus.Registered } = {}) => {
    const users = Array.from({ length: count }, (_, i) => ({
        userId: uuid(),
        email: uuid(),
        firstName: uuid(),
        lastName: uuid(),
        password: uuid(),
        created: new Date().toISOString().slice(0, 19).replace("T", " "),
        status,
    }));

    const hashedUsers = await Promise.all(
        users.map(async user => ({
            ...user,
            password: await hashPassword(user.password),
        }))
    );

    UserActions.save(hashedUsers);

    return users;
};

type Table = `${lamington}`;

export const CleanTables = async (...tables: Table[]) => {
    if (tables.includes("recipe_ingredient")) await db.table("recipe_ingredient").del();
    if (tables.includes("recipe_rating")) await db.table("recipe_rating").del();
    if (tables.includes("recipe_section")) await db.table("recipe_ingredient").del();
    if (tables.includes("recipe_step")) await db.table("recipe_step").del();
    if (tables.includes("recipe_tag")) await db.table("recipe_tag").del();

    if (tables.includes("list_item")) await db.table("list_item").del();
    if (tables.includes("list_member")) await db.table("list_member").del();

    if (tables.includes("planner_meal")) await db.table("planner_meal").del();
    if (tables.includes("planner_member")) await db.table("planner_member").del();

    if (tables.includes("book_recipe")) await db.table("book_recipe").del();
    if (tables.includes("book_member")) await db.table("book_member").del();

    if (tables.includes("ingredient")) await db.table("ingredient").del();
    if (tables.includes("recipe")) await db.table("recipe").del();
    if (tables.includes("list")) await db.table("list").del();
    if (tables.includes("planner")) await db.table("planner").del();
    if (tables.includes("book")) await db.table("book").del();
    if (tables.includes("tag")) await db.table("tag").del();
    if (tables.includes("user")) await db.table("user").del();
};

export const CreateBooks = async ({ count = randomCount, createdBy }: { count?: number; createdBy: string }) => {
    const books: CreateBookParams[] = Array.from({ length: count }, () => ({
        bookId: uuid(),
        createdBy,
        description: uuid(),
        name: uuid(),
        members: [],
    }));

    BookActions.save(books);

    return [books, count];
};
