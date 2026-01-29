import { attachment } from "../../database/definitions/attachment.ts";
import { content } from "../../database/definitions/content.ts";
import { contentAttachment } from "../../database/definitions/contentAttachment.ts";
import {
    plannerMeal,
    plannerMealColumns,
} from "../../database/definitions/meal.ts";
import { user } from "../../database/definitions/user.ts";
import { type KnexDatabase, lamington } from "../../database/index.ts";
import { toUndefined, Undefined } from "../../utils/index.ts";
import type { CookListRepository } from "../cooklistRepository.ts";
import { buildUpdateRecord } from "./common/buildUpdateRecord.ts";

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
            plannerMeal.mealId,
            plannerMeal.meal,
            plannerMeal.description,
            plannerMeal.source,
            plannerMeal.sequence,
            plannerMeal.recipeId,
            plannerMeal.notes,
            content.createdBy,
            user.firstName,
            db.ref(contentAttachment.attachmentId).as("heroAttachmentId"),
            db.ref(attachment.uri).as("heroAttachmentUri"),
        )
        .leftJoin(lamington.content, plannerMeal.mealId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .leftJoin(lamington.contentAttachment, (join) => {
            join.on(contentAttachment.contentId, "=", plannerMeal.mealId).andOn(
                contentAttachment.displayType,
                "=",
                db.raw("?", ["hero"]),
            );
        })
        .leftJoin(
            lamington.attachment,
            contentAttachment.attachmentId,
            attachment.attachmentId,
        )
        .whereIn(plannerMeal.mealId, mealIds)
        .whereNull(plannerMeal.plannerId)
        .whereNull(plannerMeal.year)
        .whereNull(plannerMeal.month);

    return { meals: result.map(formatCookListMeal) };
};

export const KnexCookListRepository: CookListRepository<KnexDatabase> = {
    readAllMeals: async (db, { userId }) => {
        const result = await db(lamington.plannerMeal)
            .select(
                plannerMeal.mealId,
                plannerMeal.meal,
                plannerMeal.description,
                plannerMeal.source,
                plannerMeal.sequence,
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
            .where(content.createdBy, userId)
            .whereNull(plannerMeal.plannerId);

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
            const updateData = buildUpdateRecord(meal, plannerMealColumns, {
                meal: ({ course }) => course,
            });

            if (updateData) {
                await db(lamington.plannerMeal)
                    .where(plannerMeal.mealId, meal.mealId)
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
        return readByIds(
            db,
            meals.map((m) => m.mealId),
        );
    },
    deleteMeals: async (db, { meals }) => {
        const count = await db(lamington.content)
            .whereIn(
                content.contentId,
                meals.map((m) => m.mealId),
            )
            .delete();
        return { count };
    },
    verifyMealPermissions: async (db, { userId, meals }) => {
        const mealOwners = await db(lamington.plannerMeal)
            .select(plannerMeal.mealId, content.createdBy)
            .leftJoin(lamington.content, content.contentId, plannerMeal.mealId)
            .where({
                [content.createdBy]: userId,
                [plannerMeal.plannerId]: null,
            })
            .whereIn(
                plannerMeal.mealId,
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
