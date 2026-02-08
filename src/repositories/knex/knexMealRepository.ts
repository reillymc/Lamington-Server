import type { MealRepository } from "../mealRepository.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import { withContentReadPermissions } from "./common/queryBuilders/withContentReadPermissions.ts";
import type { KnexDatabase } from "./knex.ts";
import {
    AttachmentTable,
    ContentAttachmentTable,
    ContentTable,
    lamington,
    PlannerMealTable,
    UserTable,
} from "./spec/index.ts";

export const KnexMealRepository: MealRepository<KnexDatabase> = {
    read: async (db, { userId, meals }) => {
        const mealIds = meals.map(({ mealId }) => mealId);
        const plannerContentAlias = "plannerContent";

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
                ContentTable.createdBy,
                UserTable.firstName,
                db
                    .ref(ContentAttachmentTable.attachmentId)
                    .as("heroAttachmentId"),
                db.ref(AttachmentTable.uri).as("heroAttachmentUri"),
            )
            .whereIn(PlannerMealTable.mealId, mealIds)
            .leftJoin(
                lamington.content,
                PlannerMealTable.mealId,
                ContentTable.contentId,
            )
            .leftJoin(lamington.user, ContentTable.createdBy, UserTable.userId)
            .leftJoin(
                `${lamington.content} as ${plannerContentAlias}`,
                PlannerMealTable.plannerId,
                `${plannerContentAlias}.contentId`,
            )
            .modify(
                withContentReadPermissions({
                    userId,
                    idColumn: PlannerMealTable.plannerId,
                    ownerColumns: [
                        ContentTable.createdBy,
                        `${plannerContentAlias}.createdBy`,
                    ],
                    allowedStatuses: ["A", "M", "O"],
                }),
            )
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
            );

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
