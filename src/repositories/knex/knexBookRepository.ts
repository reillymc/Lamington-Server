import { EnsureArray } from "@reillymc/es-utils";
import type {
    Book,
    BookColor,
    BookIcon,
    BookRepository,
    BookUserStatus,
} from "../bookRepository.ts";
import { buildUpdateRecord } from "./common/dataFormatting/buildUpdateRecord.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import { withContentAuthor } from "./common/queryBuilders/withContentAuthor.ts";
import { withContentPermissions } from "./common/queryBuilders/withContentPermissions.ts";
import {
    createContentRows,
    createDeleteContent,
} from "./common/repositoryMethods/content.ts";
import { ContentMemberActions } from "./common/repositoryMethods/contentMember.ts";
import { verifyContentPermissions } from "./common/repositoryMethods/contentPermissions.ts";
import type { ContentAuthorColumns } from "./common/rowTypes.ts";
import { type KnexRepoMethod, knexRepository } from "./knexRepository.ts";
import {
    BookRecipeTable,
    BookTable,
    ContentMemberTable,
    ContentTable,
    lamington,
} from "./spec/index.ts";

type BookRow = Pick<Book, "bookId" | "name"> & {
    description: Book["description"] | null;
    customisations: { color: BookColor; icon: BookIcon } | null;
    status: BookUserStatus | null;
} & ContentAuthorColumns;

const formatBook = (
    book: BookRow,
): Awaited<ReturnType<BookRepository["read"]>>["books"][number] => ({
    bookId: book.bookId,
    name: book.name,
    description: toUndefined(book.description),
    icon: book.customisations?.icon ?? "variant1",
    color: book.customisations?.color ?? "variant1",
    owner: {
        userId: book.createdBy,
        firstName: book.firstName,
    },
    status: book.status ?? "O",
});

const read: KnexRepoMethod<BookRepository, "read"> = async (
    db,
    { books, userId },
) => {
    const result: BookRow[] = await db(lamington.book)
        .select(
            BookTable.bookId,
            BookTable.name,
            BookTable.description,
            BookTable.customisations,
            ContentMemberTable.status,
        )
        .whereIn(
            BookTable.bookId,
            books.map(({ bookId }) => bookId),
        )
        .leftJoin(lamington.content, BookTable.bookId, ContentTable.contentId)
        .modify(withContentAuthor)
        .modify(
            withContentPermissions({
                userId,
                idColumn: BookTable.bookId,
                statuses: ["O", "A", "M"],
            }),
        );

    return {
        userId,
        books: result.map(formatBook),
    };
};

export const createKnexBookRepository = knexRepository<BookRepository>({
    create: async (db, { userId, books }) => {
        const newContent = await createContentRows(db, userId, books.length);

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
        const bookList: BookRow[] = await db(lamington.book)
            .select(
                BookTable.bookId,
                BookTable.name,
                BookTable.description,
                BookTable.customisations,
                ContentMemberTable.status,
            )
            .leftJoin(
                lamington.content,
                BookTable.bookId,
                ContentTable.contentId,
            )
            .modify(withContentAuthor)
            .modify(
                withContentPermissions({
                    userId,
                    idColumn: BookTable.bookId,
                    statuses: ["O", "A", "M", "P"],
                }),
            );

        return {
            userId,
            books: bookList.map(formatBook),
        };
    },
    read: read,
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
    readMembers: (db, request) =>
        ContentMemberActions.readByContentId(
            db,
            EnsureArray(request).map(({ bookId }) => bookId),
        ).then((members) =>
            EnsureArray(request).map(({ bookId }) => ({
                bookId,
                members: members
                    .filter(({ contentId }) => contentId === bookId)
                    .map(({ contentId, ...member }) => member),
            })),
        ),
    saveMembers: (db, request) =>
        ContentMemberActions.save(
            db,
            EnsureArray(request).flatMap(({ bookId, members = [] }) =>
                members.map(({ userId, status }) => ({
                    contentId: bookId,
                    userId,
                    status,
                })),
            ),
        ).then((members = []) =>
            EnsureArray(request).map(({ bookId }) => ({
                bookId,
                members: members.filter(
                    ({ contentId }) => contentId === bookId,
                ),
            })),
        ),
    removeMembers: (db, request) =>
        ContentMemberActions.delete(
            db,
            EnsureArray(request).flatMap(({ bookId, members = [] }) =>
                members.map(({ userId }) => ({
                    contentId: bookId,
                    userId,
                })),
            ),
        ).then(() =>
            EnsureArray(request).map(({ bookId, members = [] }) => ({
                bookId,
                count: members.length,
            })),
        ),
    verifyPermissions: async (db, { userId, books, status }) => {
        const bookIds = EnsureArray(books).map((b) => b.bookId);
        const permissions = await verifyContentPermissions(
            db,
            userId,
            bookIds,
            status,
        );
        return {
            userId,
            status,
            books: bookIds.map((bookId) => ({
                bookId,
                hasPermissions: permissions[bookId] ?? false,
            })),
        };
    },
});
