import { expect } from "expect";
import { describe, it } from "node:test";

import { BookMemberActions } from "../../src/controllers/index.ts";
import { CreateBooks, CreateUsers, randomCount } from "../helpers/index.ts";

describe("save", () => {
    it("should save one book member for one book", async () => {
        const [user] = await CreateUsers();
        const [[book]] = await CreateBooks({ count: 1, createdBy: user!.userId });
        await BookMemberActions.save({
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                },
            ],
        });

        const result = await BookMemberActions.read({ entityId: book!.bookId });

        expect(result.length).toEqual(1);

        const [member] = result;

        expect(member!.userId).toEqual(user!.userId);
    });

    it("should save multiple book members for one book", async () => {
        const users = await CreateUsers({ count: 5 });
        const [[book]] = await CreateBooks({ count: 1, createdBy: users[0]!.userId });

        await BookMemberActions.save({ bookId: book!.bookId, members: users.map(user => ({ userId: user!.userId })) });

        const result = await BookMemberActions.read({ entityId: book!.bookId });

        expect(result.length).toEqual(users.length);

        const userIds = users.map(({ userId }) => userId);

        result.forEach(member => {
            expect(userIds).toContain(member!.userId);
        });
    });

    it("should save one book member for multiple books", async () => {
        const [user] = await CreateUsers();
        const [books] = await CreateBooks({ count: 5, createdBy: user!.userId });

        await BookMemberActions.save(
            books.map(({ bookId }) => ({ bookId: bookId, members: [{ userId: user!.userId }] }))
        );

        const result = await BookMemberActions.read(books.map(({ bookId }) => ({ entityId: bookId })));

        expect(result.length).toEqual(books.length);

        result.forEach(member => {
            expect(member!.userId).toEqual(user!.userId);
        });
    });

    it("should save multiple book members for multiple books", async () => {
        const users = await CreateUsers({ count: randomCount });
        const [books] = await CreateBooks({ count: randomCount, createdBy: users[0]!.userId });

        await BookMemberActions.save(
            books.map(({ bookId }) => ({ bookId, members: users.map(user => ({ userId: user!.userId })) }))
        );

        const result = await BookMemberActions.read(books.map(({ bookId }) => ({ entityId: bookId })));

        expect(result.length).toEqual(books.length * users.length);

        const groupedByBook = result.reduce((acc, member) => {
            const bookId = member!.bookId;
            if (!acc[bookId]) {
                acc[bookId] = [];
            }
            acc[bookId]?.push(member!);
            return acc;
        }, {} as Record<string, any[]>);

        expect(Object.keys(groupedByBook).length).toEqual(books.length);

        const userIds = users.map(({ userId }) => userId);

        Object.values(groupedByBook).forEach(members => {
            expect(members.length).toEqual(users.length);
            members.forEach(member => {
                expect(userIds).toContain(member!.userId);
            });
        });
    });
});
