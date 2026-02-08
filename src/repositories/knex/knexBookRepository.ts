import { EnsureArray } from "../../utils/index.ts";
import type { BookRepository } from "../bookRepository.ts";
import { buildUpdateRecord } from "./common/dataFormatting/buildUpdateRecord.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import { withContentReadPermissions } from "./common/queryBuilders/withContentReadPermissions.ts";
import {
    createDeleteContent,
    createVerifyContentPermissions,
} from "./common/repositoryMethods/content.ts";
import {
    createReadMembers,
    createRemoveMembers,
    createSaveMembers,
} from "./common/repositoryMethods/contentMember.ts";
import type { KnexDatabase } from "./knex.ts";
import {
    BookRecipeTable,
    BookTable,
    ContentMemberTable,
    ContentTable,
    lamington,
    UserTable,
} from "./spec/index.ts";

const formatBook = (
    book: any,
): Awaited<ReturnType<BookRepository["read"]>>["books"][number] => ({
    bookId: book.bookId,
    name: book.name,
    description: toUndefined(book.description),
    icon: toUndefined(book.customisations?.icon),
    color: toUndefined(book.customisations?.color),
    owner: {
        userId: book.createdBy,
        firstName: book.firstName,
    },
    status: book.status ?? "O",
});

const read: BookRepository<KnexDatabase>["read"] = async (
    db,
    { books, userId },
) => {
    const result: any[] = await db(lamington.book)
        .select(
            BookTable.bookId,
            BookTable.name,
            BookTable.description,
            BookTable.customisations,
            ContentTable.createdBy,
            UserTable.firstName,
            ContentMemberTable.status,
        )
        .whereIn(
            BookTable.bookId,
            books.map(({ bookId }) => bookId),
        )
        .leftJoin(lamington.content, BookTable.bookId, ContentTable.contentId)
        .leftJoin(lamington.user, ContentTable.createdBy, UserTable.userId)
        .modify(
            withContentReadPermissions({
                userId,
                idColumn: BookTable.bookId,
                allowedStatuses: ["A", "M"],
            }),
        );

    return {
        userId,
        books: result.map(formatBook),
    };
};

export const KnexBookRepository: BookRepository<KnexDatabase> = {
    create: async (db, { userId, books }) => {
        const newContent = await db(lamington.content)
            .insert(books.map(() => ({ createdBy: userId })))
            .returning("contentId");

        const booksToCreate = newContent.map(({ contentId }, index) => ({
            ...books[index],
            bookId: contentId,
        }));

        await db(lamington.book).insert(
            booksToCreate.map(
                ({
                    name,
                    bookId,
                    color = "variant1",
                    icon = "variant1",
                    description,
                }) => ({
                    name,
                    bookId,
                    customisations: { color, icon },
                    description,
                }),
            ),
        );

        return read(db, { userId, books: booksToCreate });
    },
    update: async (db, { userId, books }) => {
        for (const b of books) {
            const updateData = buildUpdateRecord(b, BookTable, {
                customisations: ({ color, icon }) => {
                    if (color === undefined && icon === undefined)
                        return undefined;
                    return {
                        ...(color !== undefined ? { color } : {}),
                        ...(icon !== undefined ? { icon } : {}),
                    };
                },
            });

            if (updateData) {
                await db(lamington.book)
                    .where(BookTable.bookId, b.bookId)
                    .update(updateData);
            }
        }

        return read(db, { userId, books });
    },
    readAll: async (db, { userId }) => {
        const bookList: any[] = await db(lamington.book)
            .select(
                BookTable.bookId,
                BookTable.name,
                BookTable.description,
                BookTable.customisations,
                ContentTable.createdBy,
                UserTable.firstName,
                ContentMemberTable.status,
            )
            .leftJoin(
                lamington.content,
                BookTable.bookId,
                ContentTable.contentId,
            )
            .leftJoin(lamington.user, ContentTable.createdBy, UserTable.userId)
            .modify(
                withContentReadPermissions({
                    userId,
                    idColumn: BookTable.bookId,
                    allowedStatuses: ["A", "M", "P"],
                }),
            );

        return {
            userId,
            books: bookList.map(formatBook),
        };
    },
    read,
    delete: createDeleteContent("books", "bookId"),
    saveRecipes: async (db, request) => {
        const allBookRecipes = EnsureArray(request).flatMap(
            ({ bookId, recipes }) =>
                recipes.map(({ recipeId }) => ({ bookId, recipeId })),
        );

        const saved = await db(lamington.bookRecipe)
            .insert(allBookRecipes)
            .onConflict(["bookId", "recipeId"])
            .merge()
            .returning(["bookId", "recipeId"]);

        const savedByBookId = saved.reduce<
            Record<string, Array<{ recipeId: string }>>
        >((acc, { bookId, recipeId }) => {
            acc[bookId] = [...(acc[bookId] ?? []), { recipeId }];
            return acc;
        }, {});

        return EnsureArray(request).map(({ bookId }) => ({
            bookId,
            recipes: savedByBookId[bookId] ?? [],
        }));
    },
    removeRecipes: async (db, request) => {
        const requests = EnsureArray(request);

        const deletedRows = await db(lamington.bookRecipe)
            .where((builder) => {
                for (const { bookId, recipes } of requests) {
                    if (!recipes.length) continue;

                    builder.orWhere((b) =>
                        b.where({ [BookRecipeTable.bookId]: bookId }).whereIn(
                            BookRecipeTable.recipeId,
                            recipes.map(({ recipeId }) => recipeId),
                        ),
                    );
                }
            })
            .delete()
            .returning("bookId");

        const countsByBookId = deletedRows.reduce<Record<string, number>>(
            (acc, { bookId }) => {
                acc[bookId] = (acc[bookId] || 0) + 1;
                return acc;
            },
            {},
        );

        return requests.map(({ bookId }) => ({
            bookId,
            count: countsByBookId[bookId] || 0,
        }));
    },
    readMembers: createReadMembers("bookId"),
    saveMembers: createSaveMembers("bookId"),
    removeMembers: createRemoveMembers("bookId"),
    verifyPermissions: createVerifyContentPermissions(
        "bookId",
        "books",
        lamington.book,
    ),
};
