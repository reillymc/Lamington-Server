import { Undefined } from "../../utils/index.ts";
import type { PlannerRepository } from "../plannerRepository.ts";
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
    AttachmentTable,
    ContentAttachmentTable,
    ContentMemberTable,
    ContentTable,
    lamington,
    PlannerMealTable,
    PlannerTable,
    UserTable,
} from "./spec/index.ts";

// type SavePlannerMemberRequest = CreateQuery<{
//     plannerId: Planner["plannerId"];
//     members?: Array<{ userId: ContentMember["userId"]; status?: ContentMemberStatus }>;
// }>;

// type DeletePlannerMemberRequest = CreateQuery<{
//     plannerId: Planner["plannerId"];
//     userId: ContentMember["userId"];
// }>;

// type ReadPlannerMembersRequest = CreateQuery<{
//     plannerId: Planner["plannerId"];
// }>;

// export const PlannerMemberActions = {
//     delete: (request: DeletePlannerMemberRequest) =>
//         ContentMemberActions.delete(
//             db as KnexDatabase,
//             EnsureArray(request).map(({ plannerId, userId }) => ({ contentId: plannerId, members: [{ userId }] }))
//         ),
//     read: (request: ReadPlannerMembersRequest) =>
//         ContentMemberActions.read(
//             db as KnexDatabase,
//             EnsureArray(request).map(({ plannerId }) => ({ contentId: plannerId }))
//         ).then(response => response.map(({ contentId, ...rest }) => ({ plannerId: contentId, ...rest }))),
//     save: (request: SavePlannerMemberRequest, options?: CreateContentMemberOptions) =>
//         ContentMemberActions.save(
//             db as KnexDatabase,
//             EnsureArray(request).map(({ plannerId, members }) => ({ contentId: plannerId, members })),
//             options
//         ),
// };

const formatPlannerMeal = (
    meal: any,
): Awaited<ReturnType<PlannerRepository["readAllMeals"]>>["meals"][number] => ({
    mealId: meal.mealId,
    course: meal.meal.toLowerCase(),
    owner: {
        userId: meal.createdBy,
        firstName: meal.firstName,
    },
    plannerId: toUndefined(meal.plannerId),
    year: toUndefined(meal.year),
    month: toUndefined(meal.month),
    dayOfMonth: toUndefined(meal.dayOfMonth),
    description: toUndefined(meal.description),
    source: toUndefined(meal.source),
    recipeId: toUndefined(meal.recipeId),
    notes: toUndefined(meal.notes),
    heroImage:
        meal.heroAttachmentId && meal.heroAttachmentUri
            ? {
                  attachmentId: meal.heroAttachmentId,
                  uri: meal.heroAttachmentUri,
              }
            : undefined,
});

const readByIds = async (
    db: KnexDatabase,
    plannerId: string,
    mealIds: string[],
) => {
    const result = await db(lamington.plannerMeal)
        .select(
            PlannerMealTable.mealId,
            PlannerMealTable.plannerId,
            PlannerMealTable.year,
            PlannerMealTable.month,
            PlannerMealTable.dayOfMonth,
            PlannerMealTable.meal,
            PlannerMealTable.description,
            PlannerMealTable.source,
            PlannerMealTable.recipeId,
            PlannerMealTable.notes,
            ContentTable.createdBy,
            UserTable.firstName,
            db.ref(ContentAttachmentTable.attachmentId).as("heroAttachmentId"),
            db.ref(AttachmentTable.uri).as("heroAttachmentUri"),
        )
        .leftJoin(
            lamington.content,
            PlannerMealTable.mealId,
            ContentTable.contentId,
        )
        .leftJoin(lamington.user, ContentTable.createdBy, UserTable.userId)
        .leftJoin(lamington.contentAttachment, (join) =>
            join
                .on(
                    ContentAttachmentTable.contentId,
                    "=",
                    PlannerMealTable.mealId,
                )
                .andOn(
                    ContentAttachmentTable.displayType,
                    "=",
                    db.raw("?", ["hero"]),
                ),
        )
        .leftJoin(
            lamington.attachment,
            ContentAttachmentTable.attachmentId,
            AttachmentTable.attachmentId,
        )
        .whereIn(PlannerMealTable.mealId, mealIds)
        .modify((qb) => {
            if (plannerId) qb.where(PlannerMealTable.plannerId, plannerId);
        });

    return result.map(formatPlannerMeal);
};

const read: PlannerRepository<KnexDatabase>["read"] = async (
    db,
    { planners, userId },
) => {
    const result: any[] = await db(lamington.planner)
        .select(
            PlannerTable.plannerId,
            PlannerTable.name,
            PlannerTable.description,
            PlannerTable.customisations,
            ContentTable.createdBy,
            UserTable.firstName,
            ContentMemberTable.status,
        )
        .whereIn(
            PlannerTable.plannerId,
            planners.map(({ plannerId }) => plannerId),
        )
        .leftJoin(
            lamington.content,
            PlannerTable.plannerId,
            ContentTable.contentId,
        )
        .leftJoin(lamington.user, ContentTable.createdBy, UserTable.userId)
        .modify(
            withContentReadPermissions({
                userId,
                idColumn: PlannerTable.plannerId,
                allowedStatuses: ["A", "M"],
            }),
        );

    return {
        userId,
        planners: result.map((p) => ({
            plannerId: p.plannerId,
            name: p.name,
            description: toUndefined(p.description),
            color: p.customisations?.color,
            owner: { userId: p.createdBy, firstName: p.firstName },
            status: p.status ?? "O",
        })),
    };
};

export const KnexPlannerRepository: PlannerRepository<KnexDatabase> = {
    readAllMeals: async (db, { userId, filter }) => {
        const plannerContentAlias = "plannerContent";

        const result = await db(lamington.plannerMeal)
            .select(
                PlannerMealTable.mealId,
                PlannerMealTable.plannerId,
                PlannerMealTable.year,
                PlannerMealTable.month,
                PlannerMealTable.dayOfMonth,
                PlannerMealTable.meal,
                PlannerMealTable.description,
                PlannerMealTable.source,
                PlannerMealTable.recipeId,
                PlannerMealTable.notes,
                ContentTable.createdBy,
                UserTable.firstName,
                db
                    .ref(ContentAttachmentTable.attachmentId)
                    .as("heroAttachmentId"),
                db.ref(AttachmentTable.uri).as("heroAttachmentUri"),
            )
            .leftJoin(
                lamington.content,
                PlannerMealTable.mealId,
                ContentTable.contentId,
            )
            .leftJoin(lamington.user, ContentTable.createdBy, UserTable.userId)
            .leftJoin(lamington.contentAttachment, (join) =>
                join
                    .on(
                        ContentAttachmentTable.contentId,
                        "=",
                        PlannerMealTable.mealId,
                    )
                    .andOn(
                        ContentAttachmentTable.displayType,
                        "=",
                        db.raw("?", ["hero"]),
                    ),
            )
            .leftJoin(
                lamington.attachment,
                ContentAttachmentTable.attachmentId,
                AttachmentTable.attachmentId,
            )
            .leftJoin(
                `${lamington.content} as ${plannerContentAlias}`,
                PlannerMealTable.plannerId,
                `${plannerContentAlias}.contentId`,
            )
            .modify(
                withContentReadPermissions({
                    userId,
                    idColumn: PlannerMealTable.plannerId,
                    ownerColumns: `${plannerContentAlias}.createdBy`,
                    allowedStatuses: ["A", "M"],
                }),
            )
            .where(PlannerMealTable.plannerId, filter.plannerId)
            .andWhere((builder) => {
                if (filter.year !== undefined) {
                    builder.where({ [PlannerMealTable.year]: filter.year });
                }
                if (filter.month !== undefined) {
                    builder.where({ [PlannerMealTable.month]: filter.month });
                }
            });

        return { meals: result.map(formatPlannerMeal) };
    },
    createMeals: async (db, { plannerId, userId, meals }) => {
        const newContent = await db(lamington.content)
            .insert(meals.map(() => ({ createdBy: userId })))
            .returning("contentId");

        const mealsToCreate = meals.map((meal, index) => ({
            ...meal,
            mealId: newContent[index].contentId,
        }));

        await db(lamington.plannerMeal).insert(
            mealsToCreate.map((meal) => ({
                plannerId,
                mealId: meal.mealId,
                year: meal.year,
                month: meal.month,
                dayOfMonth: meal.dayOfMonth,
                meal: meal.course,
                description: meal.description,
                source: meal.source,
                recipeId: meal.recipeId,
                notes: meal.notes,
            })),
        );

        const attachments = mealsToCreate
            .map(({ mealId, heroImage }) => {
                if (heroImage) {
                    return {
                        contentId: mealId,
                        attachmentId: heroImage,
                        displayType: "hero",
                    };
                }
                return undefined;
            })
            .filter(Undefined);

        if (attachments.length) {
            await db(lamington.contentAttachment).insert(attachments);
        }

        const updatedMeals = await readByIds(
            db,
            plannerId,
            mealsToCreate.map((m) => m.mealId),
        );

        return { plannerId, meals: updatedMeals };
    },
    updateMeals: async (db, { plannerId, meals }) => {
        for (const meal of meals) {
            const updateData = buildUpdateRecord(meal, PlannerMealTable, {
                meal: ({ course }) => course,
            });

            if (updateData) {
                await db(lamington.plannerMeal)
                    .where(PlannerMealTable.mealId, meal.mealId)
                    .andWhere(PlannerMealTable.plannerId, plannerId)
                    .update(updateData);
            }

            if (meal.heroImage !== undefined) {
                await db(lamington.contentAttachment)
                    .where({
                        [ContentAttachmentTable.contentId]: meal.mealId,
                        [ContentAttachmentTable.displayType]: "hero",
                    })
                    .delete();

                if (meal.heroImage !== null) {
                    await db(lamington.contentAttachment).insert({
                        contentId: meal.mealId,
                        attachmentId: meal.heroImage,
                        displayType: "hero",
                    });
                }
            }
        }

        const updatedMeals = await readByIds(
            db,
            plannerId,
            meals.map((m) => m.mealId),
        );

        return { plannerId, meals: updatedMeals };
    },
    deleteMeals: async (db, { plannerId, meals }) => {
        const count = await db(lamington.content)
            .whereIn(ContentTable.contentId, (qb) => {
                qb.select(PlannerMealTable.mealId)
                    .from(lamington.plannerMeal)
                    .where(PlannerMealTable.plannerId, plannerId)
                    .whereIn(
                        PlannerMealTable.mealId,
                        meals.map((m) => m.mealId),
                    );
            })
            .delete();
        return { plannerId, count };
    },
    read,
    readAll: async (db, { userId, filter }) => {
        const plannerList: any[] = await db(lamington.planner)
            .select(
                PlannerTable.plannerId,
                PlannerTable.name,
                PlannerTable.description,
                PlannerTable.customisations,
                ContentTable.createdBy,
                UserTable.firstName,
                ContentMemberTable.status,
            )
            .leftJoin(
                lamington.content,
                PlannerTable.plannerId,
                ContentTable.contentId,
            )
            .leftJoin(lamington.user, ContentTable.createdBy, UserTable.userId)
            .modify(
                withContentReadPermissions({
                    userId,
                    idColumn: PlannerTable.plannerId,
                    allowedStatuses: ["A", "M", "P"],
                }),
            )
            .modify((qb) => {
                if (filter?.owner) {
                    qb.where({ [ContentTable.createdBy]: filter.owner });
                }
            });

        return {
            userId,
            planners: plannerList.map((p) => ({
                plannerId: p.plannerId,
                name: p.name,
                description: toUndefined(p.description),
                color: p.customisations?.color,
                owner: { userId: p.createdBy, firstName: p.firstName },
                status: p.status ?? "O",
            })),
        };
    },
    create: async (db, { userId, planners }) => {
        const newContent = await db(lamington.content)
            .insert(planners.map(() => ({ createdBy: userId })))
            .returning("contentId");

        const plannersToCreate = newContent.map(({ contentId }, index) => ({
            ...planners[index],
            plannerId: contentId,
        }));

        await db(lamington.planner).insert(
            plannersToCreate.map(({ name, plannerId, color, description }) => ({
                name,
                plannerId,
                customisations: { color },
                description,
            })),
        );

        return read(db, { userId, planners: plannersToCreate });
    },
    update: async (db, { userId, planners }) => {
        for (const p of planners) {
            const updateData = buildUpdateRecord(p, PlannerTable, {
                customisations: ({ color }) => {
                    return color !== undefined ? { color } : undefined;
                },
            });

            if (updateData) {
                await db(lamington.planner)
                    .where(PlannerTable.plannerId, p.plannerId)
                    .update(updateData);
            }
        }

        return read(db, { userId, planners });
    },
    delete: createDeleteContent("planners", "plannerId"),
    readMembers: createReadMembers("plannerId"),
    saveMembers: createSaveMembers("plannerId"),
    updateMembers: createSaveMembers("plannerId"),
    removeMembers: createRemoveMembers("plannerId"),
    verifyPermissions: createVerifyContentPermissions(
        "plannerId",
        "planners",
        lamington.planner,
    ),
};
