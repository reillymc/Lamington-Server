import { EnsureArray, Undefined } from "../../utils/index.ts";
import { ForeignKeyViolationError } from "../common/errors.ts";
import type { PlannerRepository } from "../plannerRepository.ts";
import { buildUpdateRecord } from "./common/buildUpdateRecord.ts";
import { ContentMemberActions } from "./common/contentMember.ts";
import { withContentReadPermissions } from "./common/contentQueries.ts";
import { isForeignKeyViolation } from "./common/postgresErrors.ts";
import { toUndefined } from "./common/toUndefined.ts";
import type { KnexDatabase } from "./knex.ts";
import {
    attachment,
    content,
    contentAttachment,
    contentMember,
    lamington,
    planner,
    plannerMeal,
    user,
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
            plannerMeal.mealId,
            plannerMeal.plannerId,
            plannerMeal.year,
            plannerMeal.month,
            plannerMeal.dayOfMonth,
            plannerMeal.meal,
            plannerMeal.description,
            plannerMeal.source,
            plannerMeal.recipeId,
            plannerMeal.notes,
            content.createdBy,
            user.firstName,
            db.ref(contentAttachment.attachmentId).as("heroAttachmentId"),
            db.ref(attachment.uri).as("heroAttachmentUri"),
        )
        .leftJoin(lamington.content, plannerMeal.mealId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .leftJoin(lamington.contentAttachment, (join) =>
            join
                .on(contentAttachment.contentId, "=", plannerMeal.mealId)
                .andOn(
                    contentAttachment.displayType,
                    "=",
                    db.raw("?", ["hero"]),
                ),
        )
        .leftJoin(
            lamington.attachment,
            contentAttachment.attachmentId,
            attachment.attachmentId,
        )
        .whereIn(plannerMeal.mealId, mealIds)
        .modify((qb) => {
            if (plannerId) qb.where(plannerMeal.plannerId, plannerId);
        });

    return result.map(formatPlannerMeal);
};

const read: PlannerRepository<KnexDatabase>["read"] = async (
    db,
    { planners, userId },
) => {
    const result: any[] = await db(lamington.planner)
        .select(
            planner.plannerId,
            planner.name,
            planner.description,
            planner.customisations,
            content.createdBy,
            user.firstName,
            contentMember.status,
        )
        .whereIn(
            planner.plannerId,
            planners.map(({ plannerId }) => plannerId),
        )
        .leftJoin(lamington.content, planner.plannerId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .modify(
            withContentReadPermissions({
                userId,
                idColumn: planner.plannerId,
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
    verifyPermissions: async (db, { userId, status, planners }) => {
        const statuses = EnsureArray(status);
        const memberStatuses = statuses.filter((s) => s !== "O");

        const plannerOwners: any[] = await db(lamington.planner)
            .select(planner.plannerId)
            .leftJoin(lamington.content, content.contentId, planner.plannerId)
            .whereIn(
                planner.plannerId,
                planners.map(({ plannerId }) => plannerId),
            )
            .modify(
                withContentReadPermissions({
                    userId,
                    idColumn: planner.plannerId,
                    allowedStatuses: memberStatuses,
                    ownerColumns: statuses.includes("O") ? undefined : [],
                }),
            );

        const permissionMap = Object.fromEntries(
            plannerOwners.map((p) => [p.plannerId, true]),
        );

        return {
            userId,
            status,
            planners: planners.map(({ plannerId }) => ({
                plannerId,
                hasPermissions: permissionMap[plannerId] ?? false,
            })),
        };
    },
    readAllMeals: async (db, { userId, filter }) => {
        const plannerContentAlias = "plannerContent";

        const result = await db(lamington.plannerMeal)
            .select(
                plannerMeal.mealId,
                plannerMeal.plannerId,
                plannerMeal.year,
                plannerMeal.month,
                plannerMeal.dayOfMonth,
                plannerMeal.meal,
                plannerMeal.description,
                plannerMeal.source,
                plannerMeal.recipeId,
                plannerMeal.notes,
                content.createdBy,
                user.firstName,
                db.ref(contentAttachment.attachmentId).as("heroAttachmentId"),
                db.ref(attachment.uri).as("heroAttachmentUri"),
            )
            .leftJoin(lamington.content, plannerMeal.mealId, content.contentId)
            .leftJoin(lamington.user, content.createdBy, user.userId)
            .leftJoin(lamington.contentAttachment, (join) =>
                join
                    .on(contentAttachment.contentId, "=", plannerMeal.mealId)
                    .andOn(
                        contentAttachment.displayType,
                        "=",
                        db.raw("?", ["hero"]),
                    ),
            )
            .leftJoin(
                lamington.attachment,
                contentAttachment.attachmentId,
                attachment.attachmentId,
            )
            .leftJoin(
                `${lamington.content} as ${plannerContentAlias}`,
                plannerMeal.plannerId,
                `${plannerContentAlias}.contentId`,
            )
            .modify(
                withContentReadPermissions({
                    userId,
                    idColumn: plannerMeal.plannerId,
                    ownerColumns: `${plannerContentAlias}.createdBy`,
                    allowedStatuses: ["A", "M"],
                }),
            )
            .where(plannerMeal.plannerId, filter.plannerId)
            .andWhere((builder) => {
                if (filter.year !== undefined) {
                    builder.where({ [plannerMeal.year]: filter.year });
                }
                if (filter.month !== undefined) {
                    builder.where({ [plannerMeal.month]: filter.month });
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
            const updateData = buildUpdateRecord(meal, plannerMeal, {
                meal: ({ course }) => course,
            });

            if (updateData) {
                await db(lamington.plannerMeal)
                    .where(plannerMeal.mealId, meal.mealId)
                    .andWhere(plannerMeal.plannerId, plannerId)
                    .update(updateData);
            }

            if (meal.heroImage !== undefined) {
                await db(lamington.contentAttachment)
                    .where({
                        [contentAttachment.contentId]: meal.mealId,
                        [contentAttachment.displayType]: "hero",
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
            .whereIn(content.contentId, (qb) => {
                qb.select(plannerMeal.mealId)
                    .from(lamington.plannerMeal)
                    .where(plannerMeal.plannerId, plannerId)
                    .whereIn(
                        plannerMeal.mealId,
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
                planner.plannerId,
                planner.name,
                planner.description,
                planner.customisations,
                content.createdBy,
                user.firstName,
                contentMember.status,
            )
            .leftJoin(lamington.content, planner.plannerId, content.contentId)
            .leftJoin(lamington.user, content.createdBy, user.userId)
            .modify(
                withContentReadPermissions({
                    userId,
                    idColumn: planner.plannerId,
                    allowedStatuses: ["A", "M", "P"],
                }),
            )
            .modify((qb) => {
                if (filter?.owner) {
                    qb.where({ [content.createdBy]: filter.owner });
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
            const updateData = buildUpdateRecord(p, planner, {
                customisations: ({ color }) => {
                    return color !== undefined ? { color } : undefined;
                },
            });

            if (updateData) {
                await db(lamington.planner)
                    .where(planner.plannerId, p.plannerId)
                    .update(updateData);
            }
        }

        return read(db, { userId, planners });
    },
    delete: async (db, params) => {
        const count = await db(lamington.content)
            .whereIn(
                content.contentId,
                params.planners.map(({ plannerId }) => plannerId),
            )
            .delete();
        return { count };
    },
    readMembers: async (db, request) => {
        const requests = EnsureArray(request);
        const allMembers = await ContentMemberActions.read(
            db,
            requests.map(({ plannerId }) => ({ contentId: plannerId })),
        );

        const membersByPlannerId = allMembers.reduce<
            Record<string, typeof allMembers>
        >((acc, member) => {
            acc[member.contentId] = [...(acc[member.contentId] ?? []), member];
            return acc;
        }, {});

        return requests.map(({ plannerId }) => ({
            plannerId,
            members: (membersByPlannerId[plannerId] ?? []).map(
                ({ contentId, status, ...rest }) => ({
                    ...rest,
                    status: toUndefined(status),
                }),
            ),
        }));
    },
    saveMembers: async (db, request) => {
        try {
            const response = await ContentMemberActions.save(
                db,
                EnsureArray(request).map(({ plannerId, members }) => ({
                    contentId: plannerId,
                    members,
                })),
            );
            return response.map(({ contentId, members }) => ({
                plannerId: contentId,
                members: members.map(({ status, ...rest }) => ({
                    ...rest,
                    status: toUndefined(status),
                })),
            }));
        } catch (error) {
            if (isForeignKeyViolation(error)) {
                throw new ForeignKeyViolationError(error);
            }
            throw error;
        }
    },
    updateMembers: (db, params) =>
        ContentMemberActions.save(
            db,
            EnsureArray(params).map(({ plannerId, members }) => ({
                contentId: plannerId,
                members,
            })),
            {
                trimNotIn: false,
            },
        ).then((response) =>
            response.map(({ contentId, members }) => ({
                plannerId: contentId,
                members: members.map(({ status, ...rest }) => ({
                    ...rest,
                    status: toUndefined(status),
                })),
            })),
        ),
    removeMembers: (db, request) =>
        ContentMemberActions.delete(
            db,
            EnsureArray(request).map(({ plannerId, members }) => ({
                contentId: plannerId,
                members,
            })),
        ).then((response) =>
            response.map(({ contentId, ...rest }) => ({
                plannerId: contentId,
                ...rest,
            })),
        ),
};
