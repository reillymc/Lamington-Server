import { attachment, type Attachment } from "../database/definitions/attachment.ts";
import { content, type Content } from "../database/definitions/content.ts";
import { contentAttachment } from "../database/definitions/contentAttachment.ts";
import db, {
    type DeleteService,
    type Meal,
    type ReadMyService,
    type ReadService,
    type SaveService,
    lamington,
    plannerMeal,
} from "../database/index.ts";
import { EnsureArray, Undefined } from "../utils/index.ts";
import { MealAttachmentActions } from "./mealAttachment.ts";

export type CookListMeal = Pick<Meal, "mealId" | "meal" | "description" | "recipeId" | "source" | "sequence"> &
    Pick<Content, "createdBy"> & {
        heroImage?: { attachmentId: Attachment["attachmentId"]; uri: Attachment["uri"] };
    };

/**
 * Get cook list meals by user id
 *
 * Secure - no additional route authentication check required
 * @returns an array of queued cook list meals (no dates assigned) matching given ids,
 */
const readMyMeals: ReadMyService<CookListMeal> = async params => {
    const query = await db<CookListMeal>(lamington.plannerMeal)
        .select(
            plannerMeal.mealId,
            plannerMeal.meal,
            plannerMeal.description,
            content.createdBy,
            plannerMeal.recipeId,
            plannerMeal.source,
            plannerMeal.sequence,
            db.ref(contentAttachment.attachmentId).as("heroAttachmentId"),
            db.ref(attachment.uri).as("heroAttachmentUri")
        )
        .where(content.createdBy, params.userId)
        .leftJoin(lamington.content, content.contentId, plannerMeal.mealId)
        .leftJoin(lamington.contentAttachment, contentAttachment.contentId, plannerMeal.mealId)
        .leftJoin(lamington.attachment, attachment.attachmentId, contentAttachment.attachmentId)
        .whereNull(plannerMeal.plannerId)
        .whereNull(plannerMeal.year)
        .whereNull(plannerMeal.month);

    return query.map(({ heroAttachmentId, heroAttachmentUri, ...meal }) => ({
        ...meal,
        heroImage: heroAttachmentId ? { attachmentId: heroAttachmentId, uri: heroAttachmentUri } : undefined,
    }));
};

/**
 * Creates new cook list meals or updates existing ones
 *
 * Insecure - route authentication check required (user save permission on meals)
 */
const saveMeals: SaveService<CookListMeal> = async params => {
    const meals = EnsureArray(params);

    // const result = await db.transaction(async trx => {
    await db<Content>(lamington.content)
        .insert(
            meals.map(({ mealId, createdBy }) => ({
                contentId: mealId,
                createdBy,
            }))
        )
        .onConflict("contentId")
        .merge();

    await MealAttachmentActions.save(
        meals
            .map(({ heroImage, mealId }) => {
                if (!heroImage) return;
                return {
                    mealId,
                    attachments: [{ attachmentId: heroImage.attachmentId, displayType: "hero" }],
                };
            })
            .filter(Undefined),
        { trimNotIn: true }
    );

    return db<Meal>(lamington.plannerMeal)
        .insert(
            meals.map(({ mealId, meal, description, recipeId, source, sequence }) => ({
                mealId,
                meal,
                description,
                recipeId,
                source,
                sequence,
            }))
        )
        .onConflict(["mealId"])
        .merge()
        .returning("mealId");
    // });
};

/**
 * Deletes cook list meals
 *
 * Insecure - route authentication check required (user delete permission on meals)
 * @returns the number of rows deleted
 */
const deleteMeals: DeleteService<CookListMeal, "mealId"> = async params =>
    db<Content>(lamington.content)
        .whereIn(
            "contentId",
            EnsureArray(params).map(({ mealId }) => mealId)
        )
        .delete();

/**
 * Get cook List meals by id
 *
 * Insecure - route authentication check required (user read permission on meals)
 * @returns an array of queued cook list meals matching given ids,
 */
const readMeals: ReadService<CookListMeal, "mealId"> = async params => {
    const mealIds = EnsureArray(params).map(({ mealId }) => mealId);
    return db<Meal>(lamington.plannerMeal)
        .select("mealId", "meal", "description", content.createdBy, "recipeId", "source", "sequence")
        .leftJoin(lamington.content, content.contentId, plannerMeal.mealId)
        .whereIn("mealId", mealIds)
        .whereNull("plannerId")
        .whereNull("year")
        .whereNull("month");
};

export const CookListMealActions = {
    save: saveMeals,
    delete: deleteMeals,
    readMy: readMyMeals,
};

export type CookListMealActions = typeof CookListMealActions;

export const CookListMealActionsInternal = {
    read: readMeals,
};
