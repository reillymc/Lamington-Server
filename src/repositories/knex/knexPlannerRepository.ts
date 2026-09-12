import { EnsureArray } from "@reillymc/es-utils";
import type { Meal } from "../mealRepository.ts";
import type {
    Planner,
    PlannerColor,
    PlannerMealCourse,
    PlannerRepository,
    PlannerUserStatus,
} from "../plannerRepository.ts";
import { buildUpdateRecord } from "./common/dataFormatting/buildUpdateRecord.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import { withContentAuthor } from "./common/queryBuilders/withContentAuthor.ts";
import { withContentPermissions } from "./common/queryBuilders/withContentPermissions.ts";
import { withHeroAttachment } from "./common/queryBuilders/withHeroAttachment.ts";
import {
    createContentRows,
    createDeleteContent,
} from "./common/repositoryMethods/content.ts";
import { HeroAttachmentActions } from "./common/repositoryMethods/contentAttachment.ts";
import { ContentMemberActions } from "./common/repositoryMethods/contentMember.ts";
import { verifyContentPermissions } from "./common/repositoryMethods/contentPermissions.ts";
import type {
    ContentAuthorColumns,
    HeroAttachmentColumns,
} from "./common/rowTypes.ts";
import type { KnexDatabase } from "./knex.ts";
import {
    AttachmentTable,
    ContentAttachmentTable,
    ContentMemberTable,
    ContentTable,
    lamington,
    PlannerMealTable,
    PlannerTable,
} from "./spec/index.ts";

type PlannerRow = Pick<Planner, "plannerId" | "name" | "description"> & {
    color: string | null;
    status: PlannerUserStatus | null;
} & ContentAuthorColumns;

type PlannerMealRow = Pick<
    Meal,
    "mealId" | "meal" | "description" | "source" | "recipeId" | "notes"
> & {
    plannerId: string;
    year: number;
    month: number;
    dayOfMonth: number;
} & ContentAuthorColumns &
    HeroAttachmentColumns;

const formatPlannerMeal = (
    meal: PlannerMealRow,
): Awaited<ReturnType<PlannerRepository["readAllMeals"]>>["meals"][number] => ({
    mealId: meal.mealId,
    course: meal.meal.toLowerCase() as PlannerMealCourse,
    owner: {
        userId: meal.createdBy,
        firstName: meal.firstName,
    },
    plannerId: meal.plannerId,
    year: meal.year,
    month: meal.month,
    dayOfMonth: meal.dayOfMonth,
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
    const result: PlannerMealRow[] = await db(lamington.plannerMeal)
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
            db.ref(ContentAttachmentTable.attachmentId).as("heroAttachmentId"),
            db.ref(AttachmentTable.uri).as("heroAttachmentUri"),
        )
        .leftJoin(
            lamington.content,
            PlannerMealTable.mealId,
            ContentTable.contentId,
        )
        .whereIn(PlannerMealTable.mealId, mealIds)
        .modify((qb) => {
            if (plannerId) qb.where(PlannerMealTable.plannerId, plannerId);
        })
        .modify(withHeroAttachment(PlannerMealTable.mealId))
        .modify(withContentAuthor);

    return result.map(formatPlannerMeal);
};

const read: PlannerRepository<KnexDatabase>["read"] = async (
    db,
    { planners, userId },
) => {
    const result: PlannerRow[] = await db(lamington.planner)
        .select(
            PlannerTable.plannerId,
            PlannerTable.name,
            PlannerTable.description,
            PlannerTable.color,
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
        .modify(withContentAuthor)
        .modify(
            withContentPermissions({
                userId,
                idColumn: PlannerTable.plannerId,
                statuses: ["O", "A", "M"],
            }),
        );

    return {
        userId,
        planners: result.map((p) => ({
            plannerId: p.plannerId,
            name: p.name,
            description: toUndefined(p.description),
            color: (p.color ?? "variant1") as PlannerColor,
            owner: { userId: p.createdBy, firstName: p.firstName },
            status: p.status ?? "O",
        })),
    };
};

export const KnexPlannerRepository: PlannerRepository<KnexDatabase> = {
    readAllMeals: async (db, { userId, filter }) => {
        const result: PlannerMealRow[] = await db(lamington.plannerMeal)
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
            )
            .leftJoin(
                lamington.content,
                PlannerMealTable.mealId,
                ContentTable.contentId,
            )
            .modify(withHeroAttachment(PlannerMealTable.mealId))
            .modify(withContentAuthor)
            .modify(
                withContentPermissions({
                    userId,
                    idColumn: PlannerMealTable.plannerId,
                    statuses: ["O", "A", "M"],
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
        const newContent = await createContentRows(db, userId, meals.length);

        const mealsToCreate = newContent.map(({ contentId }, index) => ({
            ...meals[index],
            mealId: contentId,
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

        await HeroAttachmentActions.save(
            db,
            mealsToCreate.map(({ mealId, heroImage }) => ({
                contentId: mealId,
                attachmentId: heroImage,
            })),
        );

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
        }

        await HeroAttachmentActions.save(
            db,
            meals.map(({ mealId, heroImage }) => ({
                contentId: mealId,
                attachmentId: heroImage,
            })),
        );

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
        const plannerList: PlannerRow[] = await db(lamington.planner)
            .select(
                PlannerTable.plannerId,
                PlannerTable.name,
                PlannerTable.description,
                PlannerTable.color,
                ContentMemberTable.status,
            )
            .leftJoin(
                lamington.content,
                PlannerTable.plannerId,
                ContentTable.contentId,
            )
            .modify(withContentAuthor)
            .modify(
                withContentPermissions({
                    userId,
                    idColumn: PlannerTable.plannerId,
                    statuses: ["O", "A", "M", "P"],
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
                color: (p.color ?? "variant1") as PlannerColor,
                owner: { userId: p.createdBy, firstName: p.firstName },
                status: p.status ?? "O",
            })),
        };
    },
    create: async (db, { userId, planners }) => {
        const newContent = await createContentRows(db, userId, planners.length);

        const plannersToCreate = newContent.map(({ contentId }, index) => ({
            ...planners[index],
            plannerId: contentId,
        }));

        await db(lamington.planner).insert(
            plannersToCreate.map(({ name, plannerId, color, description }) => ({
                name,
                plannerId,
                color,
                description,
            })),
        );

        return read(db, { userId, planners: plannersToCreate });
    },
    update: async (db, { userId, planners }) => {
        for (const p of planners) {
            const updateData = buildUpdateRecord(p, PlannerTable);

            if (updateData) {
                await db(lamington.planner)
                    .where(PlannerTable.plannerId, p.plannerId)
                    .update(updateData);
            }
        }

        return read(db, { userId, planners });
    },
    delete: createDeleteContent("planners", "plannerId", {
        table: lamington.planner,
        idColumn: PlannerTable.plannerId,
    }),
    readMembers: async (db, request) =>
        ContentMemberActions.readByContentId(
            db,
            EnsureArray(request).map(({ plannerId }) => plannerId),
        ).then((members) =>
            EnsureArray(request).map(({ plannerId }) => ({
                plannerId,
                members: members
                    .filter((m) => m.contentId === plannerId)
                    .map(({ contentId, ...member }) => member),
            })),
        ),
    saveMembers: async (db, request) =>
        ContentMemberActions.save(
            db,
            EnsureArray(request).flatMap(({ plannerId, members = [] }) =>
                members.map(({ userId, status }) => ({
                    contentId: plannerId,
                    userId,
                    status,
                })),
            ),
        ).then((members = []) =>
            EnsureArray(request).map(({ plannerId }) => ({
                plannerId,
                members: members.filter(
                    ({ contentId }) => contentId === plannerId,
                ),
            })),
        ),
    removeMembers: async (db, request) =>
        ContentMemberActions.delete(
            db,
            EnsureArray(request).flatMap(({ plannerId, members = [] }) =>
                members.map(({ userId }) => ({
                    contentId: plannerId,
                    userId,
                })),
            ),
        ).then(() =>
            EnsureArray(request).map(({ plannerId, members = [] }) => ({
                plannerId,
                count: members.length,
            })),
        ),
    verifyPermissions: async (db, { userId, planners, status }) => {
        const plannerIds = planners.map((p) => p.plannerId);
        const permissions = await verifyContentPermissions(
            db,
            userId,
            plannerIds,
            status,
            { table: lamington.planner, idColumn: PlannerTable.plannerId },
        );
        return {
            userId,
            status,
            planners: plannerIds.map((plannerId) => ({
                plannerId,
                hasPermissions: permissions[plannerId] ?? false,
            })),
        };
    },
};
