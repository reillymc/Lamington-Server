import type { AppRepositories, Database } from "../../repositories/index.ts";
import { referenceFieldErrors } from "../../utils/errors.ts";
import type { FieldReference } from "../../utils/errorTypes.ts";
import { NotFoundError } from "../service.ts";

type MealReferenceInput = {
    recipeId?: string | null;
    heroImage?: string | null;
};

type MealReferences = {
    attachmentReferences: FieldReference[];
    recipeReferences: FieldReference[];
};

export const collectMealReferences = (
    meals: ReadonlyArray<MealReferenceInput>,
    { indexed }: { indexed: boolean },
): MealReferences => {
    const attachmentReferences: FieldReference[] = [];
    const recipeReferences: FieldReference[] = [];

    meals.forEach((meal, index) => {
        const prefix = indexed ? [`${index}`] : [];

        if (meal.heroImage) {
            attachmentReferences.push({
                id: meal.heroImage,
                path: [...prefix, "heroImage"],
            });
        }

        if (meal.recipeId) {
            recipeReferences.push({
                id: meal.recipeId,
                path: [...prefix, "recipeId"],
            });
        }
    });

    return { attachmentReferences, recipeReferences };
};

export const verifyMealReferences = async (
    {
        attachmentRepository,
        recipeRepository,
    }: Pick<AppRepositories, "attachmentRepository" | "recipeRepository">,
    database: Database,
    userId: string,
    { attachmentReferences, recipeReferences }: MealReferences,
): Promise<void> => {
    const { attachments } = await attachmentRepository.verifyPermissions(
        database,
        {
            userId,
            attachments: attachmentReferences.map(({ id }) => ({
                attachmentId: id,
            })),
        },
    );

    const disallowedAttachmentIds = attachments
        .filter(({ hasPermissions }) => !hasPermissions)
        .map(({ attachmentId }) => attachmentId);

    if (disallowedAttachmentIds.length > 0) {
        throw new NotFoundError(
            "attachment",
            disallowedAttachmentIds,
            referenceFieldErrors(
                attachmentReferences,
                disallowedAttachmentIds,
                "Attachment",
            ),
        );
    }

    const { recipes } = await recipeRepository.verifyPermissions(database, {
        userId,
        recipes: recipeReferences.map(({ id }) => ({ recipeId: id })),
        status: "O",
        includePublic: true,
    });

    const disallowedRecipeIds = recipes
        .filter(({ hasPermissions }) => !hasPermissions)
        .map(({ recipeId }) => recipeId);

    if (disallowedRecipeIds.length > 0) {
        throw new NotFoundError(
            "recipe",
            disallowedRecipeIds,
            referenceFieldErrors(
                recipeReferences,
                disallowedRecipeIds,
                "Recipe",
            ),
        );
    }
};
