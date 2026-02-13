import type { MealRepository } from "../mealRepository.ts";
import { formatHeroAttachment } from "./common/dataFormatting/formatHeroAttachment.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import { withContentAuthor } from "./common/queryBuilders/withContentAuthor.ts";
import { withContentPermissions } from "./common/queryBuilders/withContentPermissions.ts";
import { withHeroAttachment } from "./common/queryBuilders/withHeroAttachment.ts";
import type { KnexDatabase } from "./knex.ts";
import { ContentTable, lamington, PlannerMealTable } from "./spec/index.ts";

export const KnexMealRepository: MealRepository<KnexDatabase> = {
    read: async (db, { userId, meals }) => {
        const mealIds = meals.map(({ mealId }) => mealId);

        const result: any[] = await db(lamington.plannerMeal)
            .select(
                PlannerMealTable.mealId,
                PlannerMealTable.plannerId,
                PlannerMealTable.year,
                PlannerMealTable.month,
                PlannerMealTable.dayOfMonth,
                PlannerMealTable.meal,
                PlannerMealTable.description,
                PlannerMealTable.source,
                PlannerMealTable.sequence,
                PlannerMealTable.recipeId,
                PlannerMealTable.notes,
            )
            .whereIn(PlannerMealTable.mealId, mealIds)
            .leftJoin(
                lamington.content,
                PlannerMealTable.mealId,
                ContentTable.contentId,
            )
            .modify(withContentAuthor)
            .modify(
                withContentPermissions({
                    userId,
                    idColumn: PlannerMealTable.plannerId,
                    statuses: ["O", "A", "M"],
                }),
            )
            .modify(withHeroAttachment(PlannerMealTable.mealId));

        return {
            userId,
            meals: result.map((meal) => ({
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
                heroImage: formatHeroAttachment(
                    meal.heroAttachmentId,
                    meal.heroAttachmentUri,
                ),
            })),
        };
    },
};
