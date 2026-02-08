import { Undefined } from "../../utils/index.ts";
import type { CookListRepository } from "../cooklistRepository.ts";
import { buildUpdateRecord } from "./common/dataFormatting/buildUpdateRecord.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import { createDeleteContent } from "./common/repositoryMethods/content.ts";
import type { KnexDatabase } from "./knex.ts";
import {
    AttachmentTable,
    ContentAttachmentTable,
    ContentTable,
    lamington,
    PlannerMealTable,
    UserTable,
} from "./spec/index.ts";

const formatCookListMeal = (
    meal: any,
): Awaited<
    ReturnType<CookListRepository["readAllMeals"]>
>["meals"][number] => ({
    mealId: meal.mealId,
    course: meal.meal.toLowerCase(),
    owner: {
        userId: meal.createdBy,
        firstName: meal.firstName,
    },
    sequence: toUndefined(meal.sequence),
    description: toUndefined(meal.description),
    source: toUndefined(meal.source),
    recipeId: toUndefined(meal.recipeId),
    notes: toUndefined(meal.notes),
    heroImage: meal.heroAttachmentId
        ? {
              attachmentId: meal.heroAttachmentId,
              uri: meal.heroAttachmentUri,
          }
        : undefined,
});

const readByIds = async (db: KnexDatabase, mealIds: string[]) => {
    const result = await db(lamington.plannerMeal)
        .select(
            PlannerMealTable.mealId,
            PlannerMealTable.meal,
            PlannerMealTable.description,
            PlannerMealTable.source,
            PlannerMealTable.sequence,
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
        .leftJoin(lamington.contentAttachment, (join) => {
            join.on(
                ContentAttachmentTable.contentId,
                "=",
                PlannerMealTable.mealId,
            ).andOn(
                ContentAttachmentTable.displayType,
                "=",
                db.raw("?", ["hero"]),
            );
        })
        .leftJoin(
            lamington.attachment,
            ContentAttachmentTable.attachmentId,
            AttachmentTable.attachmentId,
        )
        .whereIn(PlannerMealTable.mealId, mealIds)
        .whereNull(PlannerMealTable.plannerId)
        .whereNull(PlannerMealTable.year)
        .whereNull(PlannerMealTable.month);

    return { meals: result.map(formatCookListMeal) };
};

export const KnexCookListRepository: CookListRepository<KnexDatabase> = {
    readAllMeals: async (db, { userId }) => {
        const result = await db(lamington.plannerMeal)
            .select(
                PlannerMealTable.mealId,
                PlannerMealTable.meal,
                PlannerMealTable.description,
                PlannerMealTable.source,
                PlannerMealTable.sequence,
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
            .where(ContentTable.createdBy, userId)
            .whereNull(PlannerMealTable.plannerId);

        return { meals: result.map(formatCookListMeal) };
    },
    createMeals: async (db, { userId, meals }) => {
        const newContent = await db(lamington.content)
            .insert(meals.map(() => ({ createdBy: userId })))
            .returning("contentId");

        const mealsToCreate = meals.map((meal, index) => ({
            ...meal,
            mealId: newContent[index].contentId,
        }));

        await db(lamington.plannerMeal).insert(
            mealsToCreate.map((meal) => ({
                mealId: meal.mealId,
                meal: meal.course,
                description: meal.description,
                source: meal.source,
                sequence: meal.sequence,
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

        return readByIds(
            db,
            mealsToCreate.map((m) => m.mealId),
        );
    },
    updateMeals: async (db, { meals }) => {
        for (const meal of meals) {
            const updateData = buildUpdateRecord(meal, PlannerMealTable, {
                meal: ({ course }) => course,
            });

            if (updateData) {
                await db(lamington.plannerMeal)
                    .where(PlannerMealTable.mealId, meal.mealId)
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
        return readByIds(
            db,
            meals.map((m) => m.mealId),
        );
    },
    deleteMeals: createDeleteContent("meals", "mealId"),
    verifyMealPermissions: async (db, { userId, meals }) => {
        const mealOwners = await db(lamington.plannerMeal)
            .select(PlannerMealTable.mealId, ContentTable.createdBy)
            .leftJoin(
                lamington.content,
                ContentTable.contentId,
                PlannerMealTable.mealId,
            )
            .where({
                [ContentTable.createdBy]: userId,
                [PlannerMealTable.plannerId]: null,
            })
            .whereIn(
                PlannerMealTable.mealId,
                meals.map(({ mealId }) => mealId),
            );

        const permissionMap = Object.fromEntries(
            mealOwners.map((meal) => [meal.mealId, true]),
        );

        return {
            userId,
            meals: meals.map(({ mealId }) => ({
                mealId,
                hasPermissions: permissionMap[mealId] ?? false,
            })),
        };
    },
};
