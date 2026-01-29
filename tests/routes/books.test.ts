import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import db, { type KnexDatabase } from "../../src/database/index.ts";
import { KnexBookRepository } from "../../src/repositories/knex/knexBookRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import type { components, paths } from "../../src/routes/spec/index.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomNumber,
} from "../helpers/index.ts";

const randomVariant = () =>
    (["variant1", "variant2", "variant3"] as const)[
        Math.floor(Math.random() * 3)
    ];

after(async () => {
    await db.destroy();
});

describe("Get user books", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get("/v1/books");
        expect(res.statusCode).toEqual(401);
    });

    it("should return all books created by the user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { books } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }, { name: uuid() }, { name: uuid() }],
        });

        const res = await request(app).get("/v1/books").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["Book"][];
        expect(body).toHaveLength(3);

        const ids = body.map((b) => b.bookId);
        expect(ids).toContain(books[0]!.bookId);
        expect(ids).toContain(books[1]!.bookId);
        expect(ids).toContain(books[2]!.bookId);
    });

    it("should return books a user is a member of", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const { books } = await KnexBookRepository.create(database, {
            userId: otherUser!.userId,
            books: [{ name: uuid() }, { name: uuid() }, { name: uuid() }],
        });
        const [adminBook, memberBook, pendingBook] = books;

        await KnexBookRepository.saveMembers(database, [
            {
                bookId: adminBook!.bookId,
                members: [{ userId: user.userId, status: "A" }],
            },
            {
                bookId: memberBook!.bookId,
                members: [{ userId: user.userId, status: "M" }],
            },
            {
                bookId: pendingBook!.bookId,
                members: [{ userId: user.userId, status: "P" }],
            },
        ]);

        const res = await request(app).get("/v1/books").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["Book"][];
        const ids = body.map((b) => b.bookId);

        expect(ids).toContain(adminBook!.bookId);
        expect(ids).toContain(memberBook!.bookId);
        expect(ids).toContain(pendingBook!.bookId);
    });

    it("should not return books where the user is blacklisted", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const { books } = await KnexBookRepository.create(database, {
            userId: otherUser!.userId,
            books: [{ name: uuid() }],
        });
        const [blockedBook] = books;

        await KnexBookRepository.saveMembers(database, [
            {
                bookId: blockedBook!.bookId,
                members: [{ userId: user.userId, status: "B" }],
            },
        ]);

        const res = await request(app).get("/v1/books").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["Book"][];
        const ids = body.map((b) => b.bookId);

        expect(ids).not.toContain(blockedBook!.bookId);
    });
});

describe("Delete a book", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(`/v1/books/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).delete(`/v1/books/${uuid()}`).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not book owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .delete(`/v1/books/${book!.bookId}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if book member but not book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: "A",
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/books/${book!.bookId}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should delete book", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .delete(`/v1/books/${book!.bookId}`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const { books } = await KnexBookRepository.read(database, {
            userId: user.userId,
            books: [book!],
        });

        expect(books.length).toEqual(0);
    });
});

describe("Remove member from book", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(
            `/v1/books/${uuid()}/members/${uuid()}`,
        );

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .delete(`/v1/books/${uuid()}/members/${uuid()}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should allow book owner to remove member", async () => {
        const [token, bookOwner] = await PrepareAuthenticatedUser(database);
        const [user] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [{ userId: user!.userId, status: "P" }],
        });

        const res = await request(app)
            .delete(`/v1/books/${book!.bookId}/members/${user!.userId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const [bookMembers] = await KnexBookRepository.readMembers(database, {
            bookId: book!.bookId,
        });

        expect(bookMembers!.members).toHaveLength(0);
    });

    it("should not allow removing other member if book member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner, otherMember] = await CreateUsers(database, {
            count: 2,
        });

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                { userId: user!.userId, status: "A" },
                {
                    userId: otherMember!.userId,
                    status: randomBoolean() ? "A" : "M",
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/books/${book!.bookId}/members/${otherMember!.userId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });
});

describe("Remove recipe from book", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(
            `/v1/books/${uuid()}/recipes/${uuid()}`,
        );

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .delete(`/v1/books/${uuid()}/recipes/${uuid()}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not book owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: bookOwner!.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveRecipes(database, {
            bookId: book!.bookId,
            recipes: [recipe!],
        });

        const res = await request(app)
            .delete(`/v1/books/${book!.bookId}/recipes/${recipe!.recipeId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if book member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: bookOwner!.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveRecipes(database, {
            bookId: book!.bookId,
            recipes: [recipe!],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: "M",
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/books/${book!.bookId}/recipes/${recipe!.recipeId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should allow deletion if book member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: bookOwner!.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveRecipes(database, {
            bookId: book!.bookId,
            recipes: [recipe!],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: "A",
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/books/${book!.bookId}/recipes/${recipe!.recipeId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { recipes: bookRecipes } = await KnexRecipeRepository.readAll(
            database,
            {
                userId: user.userId,
                filter: { books: [book!] },
            },
        );

        expect(bookRecipes.length).toEqual(0);
    });

    it("should allow deletion if book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveRecipes(database, {
            bookId: book!.bookId,
            recipes: [recipe!],
        });

        const res = await request(app)
            .delete(`/v1/books/${book!.bookId}/recipes/${recipe!.recipeId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { recipes: bookRecipes } = await KnexRecipeRepository.readAll(
            database,
            {
                userId: user.userId,
                filter: { books: [book!] },
            },
        );
        expect(bookRecipes.length).toEqual(0);
    });

    it("should delete recipe only from specified book", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book1, book2],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }, { name: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveRecipes(database, [
            { bookId: book1!.bookId, recipes: [recipe!] },
            { bookId: book2!.bookId, recipes: [recipe!] },
        ]);

        const res = await request(app)
            .delete(`/v1/books/${book1!.bookId}/recipes/${recipe!.recipeId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { recipes: book1Recipes } = await KnexRecipeRepository.readAll(
            database,
            {
                userId: user.userId,
                filter: { books: [book1!] },
            },
        );
        expect(book1Recipes.length).toEqual(0);

        const { recipes: book2Recipes } = await KnexRecipeRepository.readAll(
            database,
            {
                userId: user.userId,
                filter: { books: [book2!] },
            },
        );

        expect(book2Recipes.length).toEqual(1);
    });
});

describe("Get a book", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(`/v1/books/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).get(`/v1/books/${uuid()}`).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should not return book user doesn't have access to", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .get(`/v1/books/${book!.bookId}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should return correct book details for book id", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                    color: randomVariant(),
                    icon: randomVariant(),
                },
            ],
        });

        const res = await request(app)
            .get(`/v1/books/${book!.bookId}`)
            .set(token);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["Book"];

        expect(data.bookId).toEqual(book!.bookId);
        expect(data.name).toEqual(book!.name);
        expect(data.description).toEqual(book!.description);
        expect(data.color).toEqual(book!.color);
        expect(data.icon).toEqual(book!.icon);
        expect(data.owner.userId).toEqual(user.userId);
        expect(data.owner.firstName).toEqual(user.firstName);
    });

    it("should return a book that a user is a member of", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                },
            ],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [{ userId: user.userId, status: "M" }],
        });

        const res = await request(app)
            .get(`/v1/books/${book!.bookId}`)
            .set(token);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["Book"];

        expect(data.bookId).toEqual(book!.bookId);
    });
});

describe("Create a book", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post("/v1/books");
        expect(res.statusCode).toEqual(401);
    });

    it("should create book", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const bookData = {
            name: uuid(),
            description: uuid(),
            color: randomVariant(),
            icon: randomVariant(),
        } satisfies components["schemas"]["BookCreate"];

        const res = await request(app)
            .post("/v1/books")
            .set(token)
            .send(bookData);

        expect(res.statusCode).toEqual(201);
        const book = res.body as components["schemas"]["Book"];

        expect(book.name).toEqual(bookData.name);
        expect(book.description).toEqual(bookData.description);
        expect(book.color).toEqual(bookData.color);
        expect(book.icon).toEqual(bookData.icon);
        expect(book.owner.userId).toEqual(user.userId);
        expect(book.status).toEqual("O");
    });
});

describe("Update a book", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).patch(`/v1/books/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should not allow editing if not book owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .patch(`/v1/books/${book!.bookId}`)
            .set(token)
            .send({ name: "book" });

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow editing if book member but not book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });
        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: "A",
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/books/${book!.bookId}`)
            .set(token)
            .send({ name: uuid() });

        expect(res.statusCode).toEqual(404);
    });

    it("should save updated book details as book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                },
            ],
        });

        const updatedBook = {
            name: uuid(),
            description: uuid(),
        } satisfies components["schemas"]["BookUpdate"];

        const res = await request(app)
            .patch(`/v1/books/${book!.bookId}`)
            .set(token)
            .send(updatedBook);

        expect(res.statusCode).toEqual(200);

        const savedBook = res.body as components["schemas"]["Book"];

        expect(savedBook!.name).toEqual(updatedBook.name);
        expect(savedBook!.description).toEqual(updatedBook.description);
        expect(savedBook!.bookId).toEqual(book!.bookId);
        expect(savedBook!.owner.userId).toEqual(book!.owner.userId);
    });
});

describe("Get book members", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const res = await request(app).get(`/v1/books/${uuid()}/members`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return book members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .get(`/v1/books/${book!.bookId}/members`)
            .set(token);

        expect(res.statusCode).toEqual(200);
        const members = res.body as components["schemas"]["Member"][];
        expect(members).toHaveLength(1);
        expect(members[0]!.userId).toEqual(member!.userId);
    });

    it("should return 404 for the member list if the user is not the owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

        for (const status of statuses) {
            const {
                books: [book],
            } = await KnexBookRepository.create(database, {
                userId: bookOwner!.userId,
                books: [{ name: uuid(), description: uuid() }],
            });

            await KnexBookRepository.saveMembers(database, {
                bookId: book!.bookId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .get(`/v1/books/${book!.bookId}/members`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Invite member to book", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(`/v1/books/${uuid()}/members`);

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post(`/v1/books/${uuid()}/members`)
            .set(token)
            .send({ userId: uuid() });

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow invite if not book owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/books/${book!.bookId}/members`)
            .set(token)
            .send({ userId: uuid() });

        expect(res.statusCode).toEqual(404);
    });

    it("should allow invite if book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [invitee] = await CreateUsers(database);

        const { books } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }],
        });
        const book = books[0]!;

        const res = await request(app)
            .post(`/v1/books/${book.bookId}/members`)
            .set(token)
            .send({ userId: invitee!.userId });

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexBookRepository.readMembers(database, {
            bookId: book.bookId,
        });
        expect(members!.members).toHaveLength(1);
        expect(members!.members[0]!.userId).toEqual(invitee!.userId);
        expect(members!.members[0]!.status).toEqual("P");
    });
});

describe("Update book member", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const res = await request(app).patch(
            `/v1/books/${uuid()}/members/${uuid()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    it("should update member status", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const { books } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid(), description: uuid() }],
        });
        const book = books[0]!;

        await KnexBookRepository.saveMembers(database, {
            bookId: book.bookId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(`/v1/books/${book.bookId}/members/${member!.userId}`)
            .set(token)
            .send({ status: "A" });

        expect(res.statusCode).toEqual(200);
        const updatedMember = res.body as components["schemas"]["Member"];
        expect(updatedMember.status).toEqual("A");
    });

    it("should not allow non-owners (A, M, P, B) to update a member status", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);
        const [member] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

        for (const status of statuses) {
            const { books } = await KnexBookRepository.create(database, {
                userId: owner!.userId,
                books: [{ name: uuid(), description: uuid() }],
            });
            const book = books[0]!;

            await KnexBookRepository.saveMembers(database, [
                {
                    bookId: book.bookId,
                    members: [
                        { userId: user.userId, status },
                        { userId: member!.userId, status: "M" },
                    ],
                },
            ]);

            const res = await request(app)
                .patch(`/v1/books/${book.bookId}/members/${member!.userId}`)
                .set(token)
                .send({ status: "A" });

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should fail when trying to update a member to restricted statuses (O, P)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const { books } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }],
        });
        const book = books[0]!;

        await KnexBookRepository.saveMembers(database, {
            bookId: book.bookId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const restrictedStatuses = ["O", "P"];

        for (const status of restrictedStatuses) {
            const res = await request(app)
                .patch(`/v1/books/${book.bookId}/members/${member!.userId}`)
                .set(token)
                .send({ status });

            expect(res.statusCode).toEqual(400);
        }
    });

    it("should return 400 when trying to update a pending member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const { books } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }],
        });
        const book = books[0]!;

        await KnexBookRepository.saveMembers(database, {
            bookId: book.bookId,
            members: [{ userId: member!.userId, status: "P" }],
        });

        const res = await request(app)
            .patch(`/v1/books/${book.bookId}/members/${member!.userId}`)
            .set(token)
            .send({ status: "M" });

        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);
        const { books } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }],
        });
        const book = books[0]!;
        await KnexBookRepository.saveMembers(database, {
            bookId: book.bookId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(`/v1/books/${book.bookId}/members/${member!.userId}`)
            .set(token)
            .send({ status: "A", extra: "invalid" });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);
        const { books } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }],
        });
        const book = books[0]!;
        await KnexBookRepository.saveMembers(database, {
            bookId: book.bookId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(`/v1/books/${book.bookId}/members/${member!.userId}`)
            .set(token)
            .send({ status: "INVALID" });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);
        const { books } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }],
        });
        const book = books[0]!;
        await KnexBookRepository.saveMembers(database, {
            bookId: book.bookId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(`/v1/books/${book.bookId}/members/${member!.userId}`)
            .set(token)
            .send({ status: null });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Accept book invitation", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should allow accepting if pending book member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                },
            ],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [{ userId: user!.userId, status: "P" }],
        });

        const res = await request(app)
            .post(`/v1/books/${book!.bookId}/invite/accept`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const [bookMembers] = await KnexBookRepository.readMembers(database, {
            bookId: book!.bookId,
        });

        expect(bookMembers!.members.length).toEqual(1);
        expect(bookMembers!.members[0]!.status).toEqual("M");
    });
});

describe("Decline book invitation", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const res = await request(app).post(
            `/v1/books/${uuid()}/invite/decline`,
        );
        expect(res.statusCode).toEqual(401);
    });

    it("should decline invitation", async () => {
        const [owner] = await CreateUsers(database);
        const [token, invitee] = await PrepareAuthenticatedUser(database);

        const { books } = await KnexBookRepository.create(database, {
            userId: owner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });
        const book = books[0]!;

        await KnexBookRepository.saveMembers(database, {
            bookId: book.bookId,
            members: [{ userId: invitee.userId, status: "P" }],
        });

        const res = await request(app)
            .post(`/v1/books/${book.bookId}/invite/decline`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexBookRepository.readMembers(database, {
            bookId: book.bookId,
        });
        expect(members!.members).toHaveLength(0);
    });

    it("should return 404 when declining an invite if the user is already a member (A, M) or blacklisted (B)", async () => {
        const [inviteeToken, invitee] =
            await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const statuses = ["A", "M", "B"] as const;

        for (const status of statuses) {
            const { books } = await KnexBookRepository.create(database, {
                userId: owner!.userId,
                books: [{ name: uuid() }],
            });
            const book = books[0]!;

            await KnexBookRepository.saveMembers(database, {
                bookId: book.bookId,
                members: [{ userId: invitee.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/books/${book.bookId}/invite/decline`)
                .set(inviteeToken);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Leave book", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const res = await request(app).post(`/v1/books/${uuid()}/leave`);
        expect(res.statusCode).toEqual(401);
    });

    it("should leave book", async () => {
        const [owner] = await CreateUsers(database);
        const [token, member] = await PrepareAuthenticatedUser(database);

        const { books } = await KnexBookRepository.create(database, {
            userId: owner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });
        const book = books[0]!;

        await KnexBookRepository.saveMembers(database, {
            bookId: book.bookId,
            members: [{ userId: member.userId, status: "M" }],
        });

        const res = await request(app)
            .post(`/v1/books/${book.bookId}/leave`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexBookRepository.readMembers(database, {
            bookId: book.bookId,
        });
        expect(members!.members).toHaveLength(0);
    });

    it("should return 404 if the owner tries to leave the book", async () => {
        const [ownerToken, owner] = await PrepareAuthenticatedUser(database);

        const { books } = await KnexBookRepository.create(database, {
            userId: owner.userId,
            books: [{ name: uuid(), description: uuid() }],
        });
        const book = books[0]!;

        const res = await request(app)
            .post(`/v1/books/${book.bookId}/leave`)
            .set(ownerToken);

        expect(res.statusCode).toEqual(404);
    });

    it("should return 404 if a pending or blacklisted user tries to leave the book", async () => {
        const [_ownerToken, owner] = await PrepareAuthenticatedUser(database);
        const [userToken, user] = await PrepareAuthenticatedUser(database);

        const statuses = ["P", "B"] as const;

        for (const status of statuses) {
            const { books } = await KnexBookRepository.create(database, {
                userId: owner.userId,
                books: [{ name: uuid() }],
            });
            const book = books[0]!;

            await KnexBookRepository.saveMembers(database, {
                bookId: book.bookId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/books/${book.bookId}/leave`)
                .set(userToken);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Add recipe to book", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(`/v1/books/${uuid()}/recipes`);

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post(`/v1/books/${uuid()}/recipes`)
            .set(token)
            .send({ recipeId: uuid() });

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow adding recipe if not book owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/books/${book!.bookId}/recipes`)
            .set(token)
            .send({ recipeId: uuid() });

        expect(res.statusCode).toEqual(404);

        const { recipes: bookRecipes } = await KnexRecipeRepository.readAll(
            database,
            {
                userId: bookOwner!.userId,
                filter: { books: [book!] },
            },
        );
        expect(bookRecipes.length).toEqual(0);
    });

    it("should not allow adding recipe if book member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user!.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: "M",
                },
            ],
        });

        const res = await request(app)
            .post(`/v1/books/${book!.bookId}/recipes`)
            .set(token)
            .send({ recipeId: recipe!.recipeId });

        expect(res.statusCode).toEqual(404);
    });

    it("should allow adding recipe if book member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user!.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: "A",
                },
            ],
        });

        const res = await request(app)
            .post(`/v1/books/${book!.bookId}/recipes`)
            .set(token)
            .send({ recipeId: recipe!.recipeId });

        expect(res.statusCode).toEqual(201);

        const { recipes: bookRecipes } = await KnexRecipeRepository.readAll(
            database,
            {
                userId: user.userId,
                filter: { books: [book!] },
            },
        );

        expect(bookRecipes.length).toEqual(1);

        const [bookRecipe] = bookRecipes;

        expect(bookRecipe!.recipeId).toEqual(recipe!.recipeId);
    });

    it("should allow adding recipe if book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        const res = await request(app)
            .post(`/v1/books/${book!.bookId}/recipes`)
            .set(token)
            .send({ recipeId: recipe!.recipeId });

        expect(res.statusCode).toEqual(201);

        const { recipes: bookRecipes } = await KnexRecipeRepository.readAll(
            database,
            {
                userId: user.userId,
                filter: { books: [book!] },
            },
        );
        expect(bookRecipes.length).toEqual(1);

        const [bookRecipe] = bookRecipes;

        expect(bookRecipe!.recipeId).toEqual(recipe!.recipeId);
    });
});

describe("Get book recipes", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(`/v1/books/${uuid()}/recipes`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for a book the user cannot access", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid() }],
        });

        const res = await request(app)
            .get(`/v1/books/${book!.bookId}/recipes`)
            .set(token);
        expect(res.statusCode).toEqual(404);
    });

    it("should return only recipes for the specified book", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }],
        });

        const { recipes: recipesInBook } = await KnexRecipeRepository.create(
            database,
            {
                userId: user.userId,
                recipes: Array.from({ length: randomNumber() }).map(() => ({
                    name: uuid(),
                    public: randomBoolean(),
                })),
            },
        );

        const { recipes: recipesNotInBook } = await KnexRecipeRepository.create(
            database,
            {
                userId: user.userId,
                recipes: Array.from({ length: randomNumber() }).map(() => ({
                    name: uuid(),
                    public: randomBoolean(),
                })),
            },
        );

        await KnexBookRepository.saveRecipes(database, {
            bookId: book!.bookId,
            recipes: recipesInBook,
        });

        const res = await request(app)
            .get(`/v1/books/${book!.bookId}/recipes`)
            .set(token);

        expect(res.statusCode).toEqual(200);

        const data =
            res.body as paths["/books/{bookId}/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

        const recipeIdsInBook = recipesInBook.map((r) => r.recipeId);
        const recipeIdsNotInBook = recipesNotInBook.map((r) => r.recipeId);

        expect(data).toBeDefined();
        expect(data.recipes.length).toEqual(recipesInBook.length);
        expect(
            data.recipes.every(({ recipeId }) =>
                recipeIdsInBook.includes(recipeId),
            ),
        ).toBe(true);
        expect(
            data.recipes.every(
                ({ recipeId }) => !recipeIdsNotInBook.includes(recipeId),
            ),
        ).toBe(true);
    });
});
