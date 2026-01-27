import { ForeignKeyViolationError } from "../repositories/common/errors.ts";
import type { components } from "../routes/spec/index.ts";
import {
    CreatedDataFetchError,
    InvalidOperationError,
    NotFoundError,
    UpdatedDataFetchError,
} from "./logging.ts";
import type { CreateService } from "./service.ts";

export interface BookService {
    getAll: (
        userId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["Book"]>>;
    get: (
        userId: string,
        bookId: string,
    ) => Promise<components["schemas"]["Book"]>;
    create: (
        userId: string,
        request: components["schemas"]["BookCreate"],
    ) => Promise<components["schemas"]["Book"]>;
    update: (
        userId: string,
        bookId: string,
        request: components["schemas"]["BookUpdate"],
    ) => Promise<components["schemas"]["Book"]>;
    delete: (userId: string, bookId: string) => Promise<void>;
    getRecipes: (
        userId: string,
        bookId: string,
        page?: number,
        search?: string,
        sort?: components["schemas"]["RecipeSortFields"],
        order?: components["schemas"]["Order"],
    ) => Promise<ReadonlyArray<components["schemas"]["Recipe"]>>;
    addRecipe: (
        userId: string,
        bookId: string,
        request: components["schemas"]["BookRecipeCreate"],
    ) => Promise<{ recipeId: string }>;
    removeRecipe: (
        userId: string,
        bookId: string,
        recipeId: string,
    ) => Promise<void>;
    getMembers: (
        userId: string,
        bookId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["Member"]>>;
    inviteMember: (
        userId: string,
        bookId: string,
        targetUserId: string,
    ) => Promise<void>;
    updateMember: (
        userId: string,
        bookId: string,
        memberId: string,
        status: components["schemas"]["MemberUpdateStatus"],
    ) => Promise<components["schemas"]["Member"]>;
    removeMember: (
        userId: string,
        bookId: string,
        memberId: string,
    ) => Promise<void>;
    leaveBook: (userId: string, bookId: string) => Promise<void>;
    acceptInvite: (userId: string, bookId: string) => Promise<void>;
    declineInvite: (userId: string, bookId: string) => Promise<void>;
}

export const createBookService: CreateService<
    BookService,
    "bookRepository" | "recipeRepository"
> = (database, { bookRepository, recipeRepository }) => ({
    getAll: async (userId) => {
        const { books } = await bookRepository.readAll(database, {
            userId,
        });

        return books.map((book) => ({
            bookId: book.bookId,
            name: book.name,
            owner: book.owner,
            description: book.description,
            color: book.color,
            icon: book.icon,
            status: book.status,
        }));
    },
    get: async (userId, bookId) => {
        const {
            books: [book],
        } = await bookRepository.read(database, {
            userId,
            books: [{ bookId }],
        });

        if (!book) {
            throw new NotFoundError("book", bookId);
        }

        return {
            bookId: book.bookId,
            name: book.name,
            owner: book.owner,
            description: book.description,
            color: book.color,
            icon: book.icon,
            status: book.status,
        };
    },
    create: (userId, request) =>
        database.transaction(async (trx) => {
            const { books } = await bookRepository.create(trx, {
                userId,
                books: [
                    {
                        name: request.name,
                        description: request.description,
                        color: request.color ?? "variant1",
                        icon: request.icon ?? "variant1",
                    },
                ],
            });

            const [book] = books;

            if (!book) {
                throw new CreatedDataFetchError("book");
            }

            return {
                bookId: book.bookId,
                name: book.name,
                owner: book.owner,
                description: book.description,
                color: book.color,
                icon: book.icon,
                status: book.status,
            };
        }),
    update: (userId, bookId, request) =>
        database.transaction(async (trx) => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: "O",
            });

            if (
                permissions.books.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("book", bookId);
            }

            const { books } = await bookRepository.update(trx, {
                userId,
                books: [{ ...request, bookId }],
            });

            const [book] = books;
            if (!book) {
                throw new UpdatedDataFetchError("book", bookId);
            }
            return book;
        }),
    delete: (userId, bookId) =>
        database.transaction(async (trx) => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: "O",
            });

            const [permission] = permissions.books;

            if (!permission?.hasPermissions) {
                throw new NotFoundError("book", bookId);
            }

            const { count } = await bookRepository.delete(trx, {
                books: [{ bookId }],
            });

            if (count === 0) {
                throw new NotFoundError("book", bookId);
            }
        }),
    getRecipes: async (userId, bookId, page, search, sort, order) => {
        const permissions = await bookRepository.verifyPermissions(database, {
            userId,
            books: [{ bookId }],
            status: ["O", "A", "M"],
        });

        if (permissions.books.some(({ hasPermissions }) => !hasPermissions)) {
            throw new NotFoundError("book", bookId);
        }

        const { recipes } = await recipeRepository.readAll(database, {
            userId,
            filter: {
                books: [{ bookId }],
                name: search,
            },
            page,
            sort,
            order,
        });
        return recipes;
    },
    addRecipe: (userId, bookId, request) =>
        database.transaction(async (trx) => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: ["O", "A"],
            });

            const [permission] = permissions.books;

            if (!permission?.hasPermissions) {
                throw new NotFoundError("book", bookId);
            }

            const [result] = await bookRepository.saveRecipes(trx, {
                bookId,
                recipes: [{ recipeId: request.recipeId }],
            });

            const recipe = result?.recipes?.[0];
            if (!recipe) {
                throw new CreatedDataFetchError("book recipe");
            }
            return { recipeId: recipe.recipeId };
        }),
    removeRecipe: (userId, bookId, recipeId) =>
        database.transaction(async (trx) => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: ["O", "A"],
            });

            const [permission] = permissions.books;

            if (!permission?.hasPermissions) {
                throw new NotFoundError("book", bookId);
            }

            const [result] = await bookRepository.removeRecipes(trx, {
                bookId,
                recipes: [{ recipeId }],
            });

            if (result?.count === 0) {
                throw new NotFoundError("book recipe", recipeId);
            }
        }),
    getMembers: async (userId, bookId) => {
        const permissions = await bookRepository.verifyPermissions(database, {
            userId,
            books: [{ bookId }],
            status: "O",
        });

        const [permission] = permissions.books;

        if (!permission?.hasPermissions) {
            throw new NotFoundError("book", bookId);
        }

        const [bookMembers] = await bookRepository.readMembers(database, {
            bookId,
        });

        if (!bookMembers) {
            throw new NotFoundError("book", bookId);
        }

        return bookMembers.members.map((m) => ({
            userId: m.userId,
            firstName: m.firstName,
            lastName: m.lastName,
            status: m.status,
        }));
    },
    inviteMember: (userId, bookId, targetUserId) =>
        database.transaction(async (trx) => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: "O",
            });

            const [permission] = permissions.books;
            if (!permission?.hasPermissions) {
                throw new NotFoundError("book", bookId);
            }

            const [currentMembers] = await bookRepository.readMembers(trx, {
                bookId,
            });
            if (
                currentMembers?.members.some((m) => m.userId === targetUserId)
            ) {
                throw new InvalidOperationError(
                    "book member",
                    "User is already a member",
                );
            }

            try {
                await bookRepository.saveMembers(trx, {
                    bookId,
                    members: [{ userId: targetUserId, status: "P" }],
                });
            } catch (error: unknown) {
                if (error instanceof ForeignKeyViolationError) {
                    throw new NotFoundError("user", targetUserId);
                }
                throw error;
            }
        }),
    updateMember: (userId, bookId, memberId, status) =>
        database.transaction(async (trx) => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: "O",
            });

            if (
                permissions.books.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("book", bookId);
            }

            const [currentPlannerMembers] = await bookRepository.readMembers(
                trx,
                { bookId },
            );
            const currentMember = currentPlannerMembers?.members.find(
                (m) => m.userId === memberId,
            );

            if (!currentMember) {
                throw new NotFoundError("book member", memberId);
            }

            if (currentMember.status === "P") {
                throw new InvalidOperationError(
                    "book member",
                    "Cannot update a pending member",
                );
            }

            await bookRepository.saveMembers(trx, {
                bookId,
                members: [{ userId: memberId, status }],
            });

            const [bookMembers] = await bookRepository.readMembers(trx, {
                bookId,
            });

            const member = bookMembers?.members.find(
                (m) => m.userId === memberId,
            );

            if (!member) {
                throw new NotFoundError("book member", memberId);
            }

            return member;
        }),
    removeMember: (userId, bookId, memberId) =>
        database.transaction(async (trx) => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: "O",
            });

            const [permission] = permissions.books;
            if (!permission?.hasPermissions) {
                throw new NotFoundError("book", bookId);
            }

            if (memberId === userId) {
                throw new InvalidOperationError(
                    "book member",
                    "Cannot remove self from book",
                );
            }

            await bookRepository.removeMembers(trx, {
                bookId,
                members: [{ userId: memberId }],
            });
        }),
    leaveBook: (userId, bookId) =>
        database.transaction(async (trx) => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: ["A", "M"],
            });
            const [permission] = permissions.books;
            if (!permission?.hasPermissions) {
                throw new NotFoundError("book", bookId);
            }

            await bookRepository.removeMembers(trx, {
                bookId,
                members: [{ userId }],
            });
        }),
    acceptInvite: (userId, bookId) =>
        database.transaction(async (trx) => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: "P",
            });

            const [permission] = permissions.books;
            if (!permission?.hasPermissions) {
                throw new NotFoundError("book", bookId);
            }

            await bookRepository.saveMembers(trx, {
                bookId,
                members: [{ userId, status: "M" }],
            });
        }),
    declineInvite: (userId, bookId) =>
        database.transaction(async (trx) => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: "P",
            });

            const [permission] = permissions.books;
            if (!permission?.hasPermissions) {
                throw new NotFoundError("book", bookId);
            }

            await bookRepository.removeMembers(trx, {
                bookId,
                members: [{ userId }],
            });
        }),
});
