import { ContentMemberActions } from "../../controllers/index.ts";
import { book, type Book } from "../../database/definitions/book.ts";
import { bookRecipe } from "../../database/definitions/bookRecipe.ts";
import { content, type Content } from "../../database/definitions/content.ts";
import { contentMember } from "../../database/definitions/contentMember.ts";
import { lamington, user, type KnexDatabase } from "../../database/index.ts";
import { EnsureArray, EnsureDefinedArray } from "../../utils/index.ts";
import type { BookRepository } from "../bookRepository.ts";
import { withContentReadPermissions } from "./common/content.ts";

const readMembers: BookRepository<KnexDatabase>["readMembers"] = async (db, request) => {
    const requests = EnsureArray(request);
    const allMembers = await ContentMemberActions.read(
        db,
        requests.map(({ bookId }) => ({ contentId: bookId }))
    );

    const membersByBookId = allMembers.reduce<Record<string, typeof allMembers>>((acc, member) => {
        acc[member.contentId] = [...(acc[member.contentId] ?? []), member];
        return acc;
    }, {});

    return requests.map(({ bookId }) => ({
        bookId,
        members: (membersByBookId[bookId] ?? []).map(({ contentId, ...rest }) => rest),
    }));
};

// TODO: refactor UI to separate members from edit page. Set members will no longer be required, as adds and removes will be used instead. Remove members from read/save services
const setMembers: BookRepository<KnexDatabase>["saveMembers"] = (db, request) =>
    ContentMemberActions.save(
        db,
        EnsureArray(request).map(({ bookId, members }) => ({ contentId: bookId, members })),
        { trimNotIn: true }
    ).then(response => response.map(({ contentId, members }) => ({ bookId: contentId, members })));

const read: BookRepository<KnexDatabase>["read"] = async (db, { books, userId }) => {
    const members = await readMembers(db, books);
    const result: any[] = await db(lamington.book)
        .select(
            book.bookId,
            book.name,
            book.description,
            book.customisations,
            content.createdBy,
            user.firstName,
            contentMember.status
        )
        .whereIn(
            book.bookId,
            books.map(({ bookId }) => bookId)
        )
        .leftJoin(lamington.content, book.bookId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .modify(withContentReadPermissions({ userId, idColumn: book.bookId }));

    return {
        userId,
        books: result.map(book => ({
            bookId: book.bookId,
            name: book.name,
            description: book.description,
            icon: book.customisations?.icon,
            color: book.customisations?.color,
            owner: { userId: book.createdBy, firstName: book.firstName },
            status: book.status ?? "O",
            members: members.find(m => m.bookId === book.bookId)?.members ?? [],
        })),
    };
};

export const KnexBookRepository: BookRepository<KnexDatabase> = {
    create: async (db, { userId, books }) => {
        const newContent = await db<Content>(lamington.content)
            .insert(books.map(() => ({ createdBy: userId })))
            .returning("contentId");

        const booksToCreate = newContent.map(({ contentId }, index) => ({
            ...books[index],
            bookId: contentId,
        }));

        await db<Book>(lamington.book).insert(
            booksToCreate.map(({ name, bookId, color, icon, description }) => ({
                name,
                bookId,
                customisations: { color, icon },
                description,
            }))
        );

        await setMembers(db, booksToCreate);
        return read(db, { userId, books: booksToCreate });
    },
    update: async (db, { userId, books }) => {
        await db<Book>(lamington.book)
            .insert(
                books.map(({ bookId, name, description, color, icon }) => ({
                    bookId,
                    name,
                    description,
                    customisations: { color, icon },
                }))
            )
            .onConflict("bookId")
            .merge(["name", "description", "customisations"]);

        await setMembers(
            db,
            books.filter(b => b.members)
        );

        return read(db, { userId, books });
    },
    verifyPermissions: async (db, { userId, status, books }) => {
        const query = db(lamington.book)
            .select("bookId")
            .leftJoin(lamington.content, content.contentId, book.bookId)
            .where({ [content.createdBy]: userId })
            .whereIn(
                book.bookId,
                books.map(({ bookId }) => bookId)
            );

        const statuses = EnsureDefinedArray(status);

        if (statuses?.length) {
            query
                .orWhere(builder =>
                    builder.where({ [contentMember.userId]: userId }).whereIn(contentMember.status, statuses)
                )
                .leftJoin(lamington.contentMember, content.contentId, contentMember.contentId);
        }

        const bookOwners: Array<Pick<Book, "bookId">> = await query;

        const permissionMap = Object.fromEntries(bookOwners.map(book => [book.bookId, true]));

        return {
            userId,
            status,
            books: books.map(({ bookId }) => ({ bookId, hasPermissions: permissionMap[bookId] ?? false })),
        };
    },
    readAll: async (db, { userId, filter }) => {
        const bookList: any[] = await db(lamington.book)
            .select(
                book.bookId,
                book.name,
                book.description,
                book.customisations,
                content.createdBy,
                user.firstName,
                contentMember.status
            )
            .leftJoin(lamington.content, book.bookId, content.contentId)
            .leftJoin(lamington.user, content.createdBy, user.userId)
            .modify(withContentReadPermissions({ userId, idColumn: book.bookId }))
            .modify(qb => {
                if (filter?.owner) {
                    qb.where({ [content.createdBy]: filter.owner });
                }
            });

        return {
            userId,
            filter,
            books: bookList.map(({ bookId, name, description, customisations, createdBy, firstName, status }) => ({
                bookId,
                name,
                description,
                icon: customisations?.icon,
                color: customisations?.color,
                owner: { userId: createdBy, firstName: firstName },
                status: status ?? "O",
            })),
        };
    },
    read,
    delete: async (db, params) => {
        const count = await db(lamington.content)
            .whereIn(
                content.contentId,
                params.books.map(({ bookId }) => bookId)
            )
            .delete();
        return { count };
    },
    saveRecipes: async (db, request) => {
        const allBookRecipes = EnsureArray(request).flatMap(({ bookId, recipes }) =>
            recipes.map(({ recipeId }) => ({ bookId, recipeId }))
        );

        const saved = await db(lamington.bookRecipe)
            .insert(allBookRecipes)
            .onConflict(["bookId", "recipeId"])
            .merge()
            .returning(["bookId", "recipeId"]);

        const savedByBookId = saved.reduce<Record<string, Array<{ recipeId: string }>>>((acc, { bookId, recipeId }) => {
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
            .where(builder => {
                for (const { bookId, recipes } of requests) {
                    if (!recipes.length) continue;

                    builder.orWhere(b =>
                        b.where({ [bookRecipe.bookId]: bookId }).whereIn(
                            bookRecipe.recipeId,
                            recipes.map(({ recipeId }) => recipeId)
                        )
                    );
                }
            })
            .delete()
            .returning("bookId");

        const countsByBookId = deletedRows.reduce<Record<string, number>>((acc, { bookId }) => {
            acc[bookId] = (acc[bookId] || 0) + 1;
            return acc;
        }, {});

        return requests.map(({ bookId }) => ({
            bookId,
            count: countsByBookId[bookId] || 0,
        }));
    },
    saveMembers: (db, request) =>
        ContentMemberActions.save(
            db,
            EnsureArray(request).map(({ bookId, members }) => ({ contentId: bookId, members }))
        ).then(response => response.map(({ contentId, members }) => ({ bookId: contentId, members }))),
    removeMembers: (db, request) =>
        ContentMemberActions.delete(
            db,
            EnsureArray(request).map(({ bookId, members }) => ({ contentId: bookId, members }))
        ).then(response => response.map(({ contentId, ...rest }) => ({ bookId: contentId, ...rest }))),
    readMembers,
};
