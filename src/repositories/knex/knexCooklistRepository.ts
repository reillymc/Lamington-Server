import type {
    CookListMealCourse,
    CookListRepository,
} from "../cooklistRepository.ts";
import type { Meal } from "../mealRepository.ts";
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
import type {
    ContentAuthorColumns,
    HeroAttachmentColumns,
} from "./common/rowTypes.ts";
import type { KnexDatabase } from "./knex.ts";
import { ContentTable, lamington, PlannerMealTable } from "./spec/index.ts";

type CookListMealRow = Pick<
    Meal,
    | "mealId"
    | "meal"
    | "description"
    | "source"
    | "sequence"
    | "recipeId"
    | "notes"
> &
    ContentAuthorColumns &
    HeroAttachmentColumns;

const formatCookListMeal = (
    meal: CookListMealRow,
): Awaited<
    ReturnType<CookListRepository["readAllMeals"]>
>["meals"][number] => ({
    mealId: meal.mealId,
    course: meal.meal.toLowerCase() as CookListMealCourse,
    owner: {
        userId: meal.createdBy,
        firstName: meal.firstName,
    },
    sequence: toUndefined(meal.sequence),
    description: toUndefined(meal.description),
    source: toUndefined(meal.source),
    recipeId: toUndefined(meal.recipeId),
    notes: toUndefined(meal.notes),
    heroImage:
        meal.heroAttachmentId && meal.heroAttachmentUri
            ? {
                  attachmentId: meal.heroAttachmentId,
                  uri: meal.heroAttachmentUri,
                  preview: toUndefined(meal.heroAttachmentPreview),
              }
            : undefined,
});

const readByIds = async (db: KnexDatabase, mealIds: string[]) => {
    const result: CookListMealRow[] = await db(lamington.plannerMeal)
        .select(
            PlannerMealTable.mealId,
            PlannerMealTable.meal,
            PlannerMealTable.description,
            PlannerMealTable.source,
            PlannerMealTable.sequence,
            PlannerMealTable.recipeId,
            PlannerMealTable.notes,
        )
        .leftJoin(
            lamington.content,
            PlannerMealTable.mealId,
            ContentTable.contentId,
        )
        .whereIn(PlannerMealTable.mealId, mealIds)
        .whereNull(PlannerMealTable.plannerId)
        .whereNull(PlannerMealTable.year)
        .whereNull(PlannerMealTable.month)
        .modify(withHeroAttachment(PlannerMealTable.mealId))
        .modify(withContentAuthor);

    return { meals: result.map(formatCookListMeal) };
};

export const KnexCookListRepository: CookListRepository<KnexDatabase> = {
    readAllMeals: async (db, { userId }) => {
        const result: CookListMealRow[] = await db(lamington.plannerMeal)
            .select(
                PlannerMealTable.mealId,
                PlannerMealTable.meal,
                PlannerMealTable.description,
                PlannerMealTable.source,
                PlannerMealTable.sequence,
                PlannerMealTable.recipeId,
                PlannerMealTable.notes,
            )
            .leftJoin(
                lamington.content,
                PlannerMealTable.mealId,
                ContentTable.contentId,
            )
            .whereNull(PlannerMealTable.plannerId)
            .modify(
                withContentPermissions({
                    userId,
                    idColumn: PlannerMealTable.mealId,
                    statuses: "O",
                }),
            )
            .modify(withHeroAttachment(PlannerMealTable.mealId))
            .modify(withContentAuthor);

        return { meals: result.map(formatCookListMeal) };
    },
    createMeals: async (db, { userId, meals }) => {
        const newContent = await createContentRows(db, userId, meals.length);

        const mealsToCreate = newContent.map(({ contentId }, index) => ({
            ...meals[index],
            mealId: contentId,
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

        await HeroAttachmentActions.save(
            db,
            mealsToCreate.map(({ mealId, heroImage }) => ({
                contentId: mealId,
                attachmentId: heroImage,
            })),
        );

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
        }

        await HeroAttachmentActions.save(
            db,
            meals.map(({ mealId, heroImage }) => ({
                contentId: mealId,
                attachmentId: heroImage,
            })),
        );

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
