import { attachment } from "../../database/definitions/attachment.ts";
import { content } from "../../database/definitions/content.ts";
import { contentAttachment } from "../../database/definitions/contentAttachment.ts";
import { plannerMeal } from "../../database/definitions/meal.ts";
import { lamington, user, type KnexDatabase } from "../../database/index.ts";
import { toUndefined } from "../../utils/index.ts";
import type { MealRepository } from "../mealRepository.ts";
import { withContentReadPermissions } from "./common/contentQueries.ts";

export const KnexMealRepository: MealRepository<KnexDatabase> = {
    read: async (db, { userId, meals }) => {
        const mealIds = meals.map(({ mealId }) => mealId);

        const result: any[] = await db(lamington.plannerMeal)
            .select(
                plannerMeal.mealId,
                plannerMeal.plannerId,
                plannerMeal.year,
                plannerMeal.month,
                plannerMeal.dayOfMonth,
                plannerMeal.meal,
                plannerMeal.description,
                plannerMeal.source,
                plannerMeal.sequence,
                plannerMeal.recipeId,
                plannerMeal.notes,
                content.createdBy,
                user.firstName,
                db.ref(contentAttachment.attachmentId).as("heroAttachmentId"),
                db.ref(attachment.uri).as("heroAttachmentUri")
            )
            .whereIn(plannerMeal.mealId, mealIds)
            .leftJoin(lamington.content, plannerMeal.mealId, content.contentId)
            .leftJoin(lamington.user, content.createdBy, user.userId)
            .modify(withContentReadPermissions({ userId, idColumn: plannerMeal.plannerId }))
            .leftJoin(lamington.contentAttachment, join =>
                join
                    .on(contentAttachment.contentId, "=", plannerMeal.mealId)
                    .andOn(contentAttachment.displayType, "=", db.raw("?", ["hero"]))
            )
            .leftJoin(lamington.attachment, contentAttachment.attachmentId, attachment.attachmentId);

        return {
            userId,
            meals: result.map(meal => ({
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
                sequence: toUndefined(meal.sequence),
                recipeId: toUndefined(meal.recipeId),
                notes: toUndefined(meal.notes),
                heroImage: meal.heroAttachmentId
                    ? {
                          attachmentId: meal.heroAttachmentId,
                          uri: meal.heroAttachmentUri,
                      }
                    : undefined,
            })),
        };
    },
};
