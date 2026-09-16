import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import { v4 as uuid } from "uuid";
import { createContentRows } from "../../src/repositories/knex/common/repositoryMethods/content.ts";
import { HeroAttachmentActions } from "../../src/repositories/knex/common/repositoryMethods/contentAttachment.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexIngredientRepository } from "../../src/repositories/knex/knexIngredientRepository.ts";
import { KnexListRepository } from "../../src/repositories/knex/knexListRepository.ts";
import { CreateUsers, PrepareAuthenticatedUser } from "../helpers/index.ts";
import { db } from "../helpers/setup.ts";

let database: KnexDatabase;

beforeEach(async () => {
    database = await db.transaction();
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

const createAttachmentRow = async (userId: string) => {
    const [row] = await database("attachment")
        .insert({ createdBy: userId })
        .returning("attachmentId");
    return row!;
};

const readAttachments = async () =>
    await database("attachment")
        .select("attachmentId", "deletedAt")
        .orderBy("attachmentId");

const readActiveAttachmentIds = async () =>
    (await readAttachments())
        .filter(({ deletedAt }) => deletedAt === null)
        .map(({ attachmentId }) => attachmentId);

const readDeletedAttachmentIds = async () =>
    (await readAttachments())
        .filter(({ deletedAt }) => deletedAt !== null)
        .map(({ attachmentId }) => attachmentId);

const readContentIds = async () =>
    (await database("content").select("contentId")).map(
        ({ contentId }) => contentId,
    );

/**
 * Tests that fall outside the scope of what is possible via the API but still
 * valid internal use cases.
 */
describe("Content attachment internal semantics", () => {
    describe("HeroAttachmentActions.save", () => {
        it("should keep attachments that are swapped between contents in a single save", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(database);

            const [contentA, contentB] = await createContentRows(
                database,
                userId,
                2,
            );

            const attachmentA = await createAttachmentRow(userId);
            const attachmentB = await createAttachmentRow(userId);

            await HeroAttachmentActions.save(database, [
                {
                    contentId: contentA!.contentId,
                    attachmentId: attachmentA.attachmentId,
                },
                {
                    contentId: contentB!.contentId,
                    attachmentId: attachmentB.attachmentId,
                },
            ]);

            await HeroAttachmentActions.save(database, [
                {
                    contentId: contentA!.contentId,
                    attachmentId: attachmentB.attachmentId,
                },
                {
                    contentId: contentB!.contentId,
                    attachmentId: attachmentA.attachmentId,
                },
            ]);

            expect(await readActiveAttachmentIds()).toEqual(
                [attachmentA.attachmentId, attachmentB.attachmentId].sort(),
            );
            expect(await readDeletedAttachmentIds()).toEqual([]);
        });

        it("should mark an attachment deleted when its hero is replaced", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(database);

            const [content] = await createContentRows(database, userId, 1);

            const attachmentA = await createAttachmentRow(userId);
            const attachmentB = await createAttachmentRow(userId);

            await HeroAttachmentActions.save(database, [
                {
                    contentId: content!.contentId,
                    attachmentId: attachmentA.attachmentId,
                },
            ]);

            await HeroAttachmentActions.save(database, [
                {
                    contentId: content!.contentId,
                    attachmentId: attachmentB.attachmentId,
                },
            ]);

            expect(await readActiveAttachmentIds()).toEqual([
                attachmentB.attachmentId,
            ]);
            expect(await readDeletedAttachmentIds()).toEqual([
                attachmentA.attachmentId,
            ]);
        });

        it("should mark an attachment deleted when its hero is cleared", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(database);

            const [content] = await createContentRows(database, userId, 1);

            const attachment = await createAttachmentRow(userId);

            await HeroAttachmentActions.save(database, [
                {
                    contentId: content!.contentId,
                    attachmentId: attachment.attachmentId,
                },
            ]);

            await HeroAttachmentActions.save(database, [
                {
                    contentId: content!.contentId,
                    attachmentId: null,
                },
            ]);

            expect(await readActiveAttachmentIds()).toEqual([]);
            expect(await readDeletedAttachmentIds()).toEqual([
                attachment.attachmentId,
            ]);
        });

        it("should keep an attachment active while another content references it", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(database);

            const [contentA, contentB] = await createContentRows(
                database,
                userId,
                2,
            );

            const attachmentA = await createAttachmentRow(userId);
            const attachmentB = await createAttachmentRow(userId);

            await HeroAttachmentActions.save(database, [
                {
                    contentId: contentA!.contentId,
                    attachmentId: attachmentA.attachmentId,
                },
                {
                    contentId: contentB!.contentId,
                    attachmentId: attachmentA.attachmentId,
                },
            ]);

            await HeroAttachmentActions.save(database, [
                {
                    contentId: contentA!.contentId,
                    attachmentId: attachmentB.attachmentId,
                },
            ]);

            expect(await readActiveAttachmentIds()).toEqual(
                [attachmentA.attachmentId, attachmentB.attachmentId].sort(),
            );
            expect(await readDeletedAttachmentIds()).toEqual([]);
        });
    });

    describe("owned child content cascades", () => {
        it("should delete list item content rows when their ingredient is deleted", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(database);

            const {
                ingredients: [ingredient],
            } = await KnexIngredientRepository.create(database, {
                userId,
                ingredients: [{ name: uuid() }],
            });

            const {
                lists: [list],
            } = await KnexListRepository.create(database, {
                userId,
                lists: [{ name: uuid() }],
            });

            const {
                items: [item],
            } = await KnexListRepository.createItems(database, {
                userId,
                listId: list!.listId,
                items: [
                    { name: uuid(), ingredientId: ingredient!.ingredientId },
                ],
            });

            await database("content")
                .where("contentId", ingredient!.ingredientId)
                .delete();

            expect(
                await database("list_item")
                    .select("itemId")
                    .where("itemId", item!.itemId),
            ).toHaveLength(0);
            expect(await readContentIds()).not.toContain(item!.itemId);
        });

        it("should delete note content rows when their parent content is deleted", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(database);

            const [parent] = await createContentRows(database, userId, 1);
            const [noteContent] = await createContentRows(database, userId, 1);

            await database("content_note").insert({
                noteId: noteContent!.contentId,
                parentId: parent!.contentId,
                title: uuid(),
                content: uuid(),
            });

            const attachment = await createAttachmentRow(userId);
            await HeroAttachmentActions.save(database, [
                {
                    contentId: noteContent!.contentId,
                    attachmentId: attachment.attachmentId,
                },
            ]);

            await database("content")
                .where("contentId", parent!.contentId)
                .delete();

            expect(
                await database("content_note").select("noteId"),
            ).toHaveLength(0);
            expect(await readContentIds()).not.toContain(
                noteContent!.contentId,
            );
            expect(
                await database("content_attachment")
                    .select("attachmentId")
                    .where("attachmentId", attachment.attachmentId),
            ).toHaveLength(0);
            expect(await readDeletedAttachmentIds()).toEqual([
                attachment.attachmentId,
            ]);
        });
    });

    describe("concurrent saves", () => {
        it("does not deadlock when attachments are swapped between contents", async () => {
            const [user] = await db.transaction((trx) => CreateUsers(trx));
            const userId = user!.userId;

            const [contentA] = await db("content")
                .insert({ createdBy: userId })
                .returning("contentId");
            const [contentB] = await db("content")
                .insert({ createdBy: userId })
                .returning("contentId");
            const [attachmentA] = await db("attachment")
                .insert({ createdBy: userId })
                .returning("attachmentId");
            const [attachmentB] = await db("attachment")
                .insert({ createdBy: userId })
                .returning("attachmentId");

            const contentIds = [contentA!.contentId, contentB!.contentId];
            const attachmentIds = [
                attachmentA!.attachmentId,
                attachmentB!.attachmentId,
            ];

            try {
                await Promise.all(
                    Array.from({ length: 5 }, () =>
                        Promise.all([
                            db.transaction((trx) =>
                                HeroAttachmentActions.save(trx, [
                                    {
                                        contentId: contentIds[0]!,
                                        attachmentId: attachmentIds[0]!,
                                    },
                                    {
                                        contentId: contentIds[1]!,
                                        attachmentId: attachmentIds[1]!,
                                    },
                                ]),
                            ),
                            db.transaction((trx) =>
                                HeroAttachmentActions.save(trx, [
                                    {
                                        contentId: contentIds[0]!,
                                        attachmentId: attachmentIds[1]!,
                                    },
                                    {
                                        contentId: contentIds[1]!,
                                        attachmentId: attachmentIds[0]!,
                                    },
                                ]),
                            ),
                        ]),
                    ),
                );

                expect(
                    await db("attachment")
                        .select("attachmentId")
                        .whereIn("attachmentId", attachmentIds)
                        .whereNotNull("deletedAt"),
                ).toHaveLength(0);
            } finally {
                await db("content").whereIn("contentId", contentIds).delete();
                await db("attachment")
                    .whereIn("attachmentId", attachmentIds)
                    .delete();
                await db("user").where("userId", userId).delete();
            }
        });
    });
});
