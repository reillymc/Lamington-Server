import { content, type Content } from "../../database/definitions/content.ts";
import {
    contentTag,
    ingredient,
    lamington,
    PAGE_SIZE,
    user,
    type ContentTag,
    type CreateQuery,
    type CreateResponse,
    type Ingredient,
    type KnexDatabase,
    type User,
} from "../../database/index.ts";
import { EnsureArray, ObjectFromEntries, Undefined } from "../../utils/index.ts";
import type { RecipeRepository } from "../recipeRepository.ts";
import { contentAttachment, type ContentAttachment } from "../../database/definitions/contentAttachment.ts";
import { attachment, type Attachment } from "../../database/definitions/attachment.ts";
import { recipeRating, type RecipeRating } from "../../database/definitions/recipeRating.ts";
import { recipe, type Recipe } from "../../database/definitions/recipe.ts";
import { recipeIngredient, type RecipeIngredient } from "../../database/definitions/recipeIngredient.ts";
import { bookRecipe } from "../../database/definitions/bookRecipe.ts";
import { DefaultSection, type RecipeSection } from "../../database/definitions/recipeSection.ts";
import { recipeStep, type RecipeStep } from "../../database/definitions/recipeStep.ts";
import { ContentTagActions } from "../../controllers/content/contentTag.ts";
import type { RecipeMethod } from "../../routes/spec/recipe.ts";
import {
    ContentAttachmentActions,
    type CreateContentAttachmentOptions,
} from "../../controllers/content/contentAttachment.ts";

type SaveRecipeAttachmentRequest = CreateQuery<{
    recipeId: Recipe["recipeId"];
    attachments: Array<{
        attachmentId: Attachment["attachmentId"];
        displayType: ContentAttachment["displayType"];
        displayId?: ContentAttachment["displayId"];
        displayOrder?: ContentAttachment["displayOrder"];
    }>;
}>;

type ReadRecipeAttachmentsRequest = CreateQuery<{
    recipeId: Recipe["recipeId"];
}>;

type ReadRecipeAttachmentsResponse = {
    attachmentId: Attachment["attachmentId"];
    uri: Attachment["uri"];
    displayType: ContentAttachment["displayType"];
    displayId?: ContentAttachment["displayId"];
    displayOrder: ContentAttachment["displayOrder"];
    createdBy: Attachment["createdBy"];
    recipeId: Recipe["recipeId"];
};

export const RecipeAttachmentActions = {
    read: (db: KnexDatabase, request: ReadRecipeAttachmentsRequest): CreateResponse<ReadRecipeAttachmentsResponse> =>
        ContentAttachmentActions.read(
            db,
            EnsureArray(request).map(({ recipeId }) => ({ contentId: recipeId }))
        ).then(response => response.map(({ contentId, ...rest }) => ({ recipeId: contentId, ...rest }))),
    save: (db: KnexDatabase, request: SaveRecipeAttachmentRequest, options?: CreateContentAttachmentOptions) =>
        ContentAttachmentActions.save(
            db,
            EnsureArray(request).map(({ recipeId, attachments }) => ({
                contentId: recipeId,
                attachments,
            })),
            options
        ),
};
const ContentTagsRequestToRows = (contentId: string, tags: Array<{ tagId: string }>): ContentTag[] =>
    tags.map(({ tagId }) => ({ contentId, tagId }));

const readTags = (
    db: KnexDatabase,
    request: CreateQuery<{
        recipeId: Recipe["recipeId"];
    }>
) =>
    ContentTagActions.readByContentId(
        db,
        EnsureArray(request).map(({ recipeId }) => recipeId)
    ).then(response => response.map(({ contentId, ...rest }) => ({ recipeId: contentId, ...rest })));

const saveTags = (
    db: KnexDatabase,
    request: CreateQuery<{
        recipeId: Recipe["recipeId"];
        tags: Array<Pick<ContentTag, "tagId">>;
    }>
) =>
    ContentTagActions.save(
        db,
        EnsureArray(request).map(({ recipeId, tags }) => ({ contentId: recipeId, tags }))
    );

const readStepsByRecipeId = async (db: KnexDatabase, recipeId: string) =>
    db<RecipeStep>(lamington.recipeStep)
        .where({ [recipeStep.recipeId]: recipeId })
        .select(recipeStep.id, recipeStep.sectionId, recipeStep.index, recipeStep.description);

/**
 * Update RecipeSteps for recipeId, by deleting all steps not in step list and then creating / updating provided steps in list
 * @param recipeId recipe to modify
 * @param recipeSteps steps to include in recipe
 */
const saveRecipeStepRows = async (
    db: KnexDatabase,
    params: Pick<Recipe, "recipeId"> & { recipeSteps: RecipeStep[] }
) => {
    const deleteExcessRows = async (recipeId: string, retainedStepIds: string[]) =>
        db<RecipeStep>(lamington.recipeStep).where({ recipeId }).whereNotIn("id", retainedStepIds).del();

    const insertRows = async (recipeSteps: RecipeStep[]) =>
        db<RecipeStep>(lamington.recipeStep).insert(recipeSteps).onConflict(["recipeId", "id"]).merge();

    await deleteExcessRows(
        params.recipeId,
        params.recipeSteps.map(({ id }) => id)
    );
    if (params.recipeSteps.length > 0) await insertRows(params.recipeSteps);
};

/**
 * Get all ingredients for a recipe
 * @param recipeId recipe to retrieve ingredients from
 * @returns RecipeIngredient
 */
const queryRecipeIngredientsByRecipeId = async (db: KnexDatabase, { recipeId }: Pick<Recipe, "recipeId">) => {
    const data = await db(lamington.recipeIngredient)
        .where({ [recipeIngredient.recipeId]: recipeId })
        .select(
            recipeIngredient.id,
            recipeIngredient.ingredientId,
            recipeIngredient.subrecipeId,
            `${recipe.name} as recipeName`,
            `${ingredient.name} as ingredientName`,
            recipeIngredient.sectionId,
            recipeIngredient.index,
            recipeIngredient.description,
            recipeIngredient.unit,
            recipeIngredient.amount,
            recipeIngredient.multiplier
        )
        .leftJoin(lamington.ingredient, recipeIngredient.ingredientId, ingredient.ingredientId)
        .leftJoin(lamington.recipe, recipeIngredient.subrecipeId, recipe.recipeId);

    const result = data.map(({ recipeName, ingredientName, ...rest }) => ({
        ...rest,
        name: ingredientName ?? recipeName,
    }));

    return { result };
};

/**
 * Update RecipeIngredients for recipeId, by deleting all ingredients not in ingredient list and then creating / updating provided ingredients in list
 * @param recipeId recipe to modify
 * @param recipeIngredients ingredients to include in recipe
 */
const saveRecipeIngredientRows = async (
    db: KnexDatabase,
    params: Pick<Recipe, "recipeId"> & { ingredients: Array<Omit<RecipeIngredient, "recipeId">> }
) => {
    const recipeIngredients = EnsureArray(params);

    const deleteExcessRows = async (recipeId: string, retainedIds: string[]) =>
        db<RecipeIngredient>(lamington.recipeIngredient).where({ recipeId }).whereNotIn("id", retainedIds).delete();

    const insertRows = async (recipeIngredients: RecipeIngredient[]) =>
        db<RecipeIngredient>(lamington.recipeIngredient)
            .insert(recipeIngredients)
            .onConflict(["id", "recipeId"])
            .merge();

    for (const { recipeId, ingredients } of recipeIngredients) {
        await deleteExcessRows(recipeId, ingredients.map(({ id }) => id).filter(Undefined));
    }

    const ingredients = recipeIngredients.flatMap(({ recipeId, ingredients }) =>
        ingredients.map((recipeIngredient): RecipeIngredient => ({ ...recipeIngredient, recipeId }))
    );

    if (ingredients.length > 0) await insertRows(ingredients);

    return [];
};

/**
 * Update RecipeSections for recipeId, by deleting all steps not in step list and then creating / updating provided steps in list
 * @param recipeId recipe to modify
 * @param recipeSections steps to include in recipe
 */
const saveSectionRows = async (
    db: KnexDatabase,
    params: Pick<Recipe, "recipeId"> & { sections: Array<Omit<RecipeSection, "recipeId">> }
) => {
    const deleteExcessRows = async (recipeId: string, retainedSectionIds: string[]) =>
        db<RecipeSection>(lamington.recipeSection)
            .where({ recipeId })
            .whereNotIn("sectionId", retainedSectionIds)
            .del();

    const insertRows = async (recipeSections: RecipeSection[]) =>
        db<RecipeSection>(lamington.recipeSection).insert(recipeSections).onConflict(["recipeId", "sectionId"]).merge();

    const recipeSections = EnsureArray(params);

    for (const { recipeId, sections } of recipeSections) {
        await deleteExcessRows(
            recipeId,
            sections.map(({ sectionId }) => sectionId)
        );
    }

    const sections = recipeSections.flatMap(({ recipeId, sections }) =>
        sections.map((section): RecipeSection => ({ ...section, recipeId }))
    );

    if (sections.length > 0) await insertRows(sections);

    return [];
};

/**
 * Get all method steps for a recipe
 * @param recipeId recipe to retrieve steps from
 * @returns RecipeSection array
 */
const querySectionsByRecipeId = async (db: KnexDatabase, { recipeId }: Pick<Recipe, "recipeId">) => {
    const result = await db<RecipeSection>(lamington.recipeSection)
        .where({ recipeId })
        .select("recipeId", "sectionId", "index", "name", "description");

    return { result };
};

const ratingPersonalName = "rating_personal";
const ratingAverageName = "rating_average";

const RecipeBase = (db: KnexDatabase, userId: string) => {
    const ratingsSubquery = db(lamington.recipeRating)
        .select(recipeRating.recipeId)
        .avg({ rating_average: recipeRating.rating })
        .groupBy(recipeRating.recipeId)
        .as("avg_ratings");

    return db(lamington.recipe)
        .select(
            recipe.recipeId,
            recipe.name,
            recipe.timesCooked,
            recipe.cookTime,
            recipe.prepTime,
            recipe.public,
            content.createdBy,
            db.ref(user.firstName).as("createdByName"),
            db.ref("avg_ratings.rating_average"),
            db(lamington.recipeRating)
                .select(recipeRating.rating)
                .whereRaw('"recipe_rating"."recipeId" = "recipe"."recipeId"')
                .andWhere(recipeRating.raterId, userId)
                .first()
                .as("rating_personal"),
            db.ref(contentAttachment.attachmentId).as("heroAttachmentId"),
            db.ref(attachment.uri).as("heroAttachmentUri")
        )
        .leftJoin(lamington.content, recipe.recipeId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .leftJoin(ratingsSubquery, recipe.recipeId, "avg_ratings.recipeId")
        .leftJoin(lamington.contentAttachment, join => {
            join.on(contentAttachment.contentId, "=", recipe.recipeId).andOn(
                contentAttachment.displayType,
                "=",
                db.raw("?", ["hero"])
            );
        })
        .leftJoin(lamington.attachment, contentAttachment.attachmentId, attachment.attachmentId);
};

type GetFullRecipeResults =
    | (Pick<
          Recipe,
          | "recipeId"
          | "name"
          | "timesCooked"
          | "cookTime"
          | "prepTime"
          | "public"
          | "tips"
          | "summary"
          | "servings"
          | "source"
          | "nutritionalInformation"
      > & {
          [ratingAverageName]: string;
          [ratingPersonalName]: RecipeRating["rating"];
          createdByName: User["firstName"];
          createdBy: Content["createdBy"];
      })
    | undefined;

const getFullRecipe = async (db: KnexDatabase, recipeId: string, userId: string): Promise<GetFullRecipeResults> => {
    const ratingsSubquery = db(lamington.recipeRating)
        .select(recipeRating.recipeId)
        .avg({ rating_average: recipeRating.rating })
        .groupBy(recipeRating.recipeId)
        .as("avg_ratings");

    const query = db(lamington.recipe)
        .select(
            recipe.recipeId,
            "name",
            "source",
            "servings",
            "prepTime",
            "cookTime",
            "tips",
            "summary",
            "public",
            "timesCooked",
            "nutritionalInformation",
            content.createdBy,
            content.createdAt,
            content.updatedAt,
            db.ref(user.firstName).as("createdByName"),
            db.ref("avg_ratings.rating_average"),
            db(lamington.recipeRating)
                .select(recipeRating.rating)
                .whereRaw('"recipe_rating"."recipeId" = "recipe"."recipeId"')
                .andWhere(recipeRating.raterId, userId)
                .first()
                .as("rating_personal")
        )
        .leftJoin(lamington.content, recipe.recipeId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .leftJoin(ratingsSubquery, recipe.recipeId, "avg_ratings.recipeId")
        .where(recipe.recipeId, recipeId)
        .first();

    return query;
};

const read: RecipeRepository<KnexDatabase>["read"] = async (db, { userId, recipes }) => {
    const response: Awaited<ReturnType<RecipeRepository["read"]>>["recipes"] = [];

    // TODO: remove loop and use requests keyed by recipe id for sub-queries
    for (const { recipeId } of recipes) {
        // Fetch from database
        const [recipe, tags, { result: ingredients }, method, { result: sections }, attachments] = await Promise.all([
            getFullRecipe(db, recipeId, userId),
            readTags(db, { recipeId }),
            queryRecipeIngredientsByRecipeId(db, { recipeId }),
            readStepsByRecipeId(db, recipeId),
            querySectionsByRecipeId(db, { recipeId }),
            RecipeAttachmentActions.read(db, { recipeId }),
        ]);

        if (!recipe) continue;

        const heroAttachment = attachments?.find(att => att.displayType === "hero");

        response.push({
            recipeId: recipe.recipeId,
            owner: { userId: recipe.createdBy, firstName: recipe.createdByName },
            rating: {
                average: parseFloat(recipe[ratingAverageName]),
                personal: recipe[ratingPersonalName],
            },
            name: recipe.name,
            cookTime: recipe.cookTime,
            nutritionalInformation: recipe.nutritionalInformation,
            prepTime: recipe.prepTime,
            public: recipe.public,
            servings: recipe.servings,
            source: recipe.source,
            summary: recipe.summary,
            timesCooked: recipe.timesCooked,
            tips: recipe.tips,
            ingredients: recipeIngredientRowsToResponse({ ingredients, sections }),
            method: recipeStepRowsToResponse({ method, sections }),
            tags: ContentTagRowsToResponse(tags),
            photo: heroAttachment,
        });
    }

    return {
        userId,
        recipes: response,
    };
};

export const KnexRecipeRepository: RecipeRepository<KnexDatabase> = {
    create: async (db, { userId, recipes }) => {
        // TODO extract to content helper and use for book too
        const newContent = await db<Content>(lamington.content)
            .insert(recipes.map(() => ({ createdBy: userId })))
            .returning("contentId");

        const recipesToCreate = newContent.map(({ contentId }, index) => ({
            ...recipes[index],
            recipeId: contentId,
        }));

        await db<Recipe>(lamington.recipe).insert(
            recipesToCreate.map(recipe => ({
                name: recipe.name,
                public: recipe.public,
                recipeId: recipe.recipeId,
                cookTime: recipe.cookTime,
                nutritionalInformation: recipe.nutritionalInformation,
                prepTime: recipe.prepTime,
                servings: recipe.servings,
                source: recipe.source,
                summary: recipe.summary,
                timesCooked: recipe.timesCooked,
                tips: recipe.tips,
            }))
        );

        const recipesSections = recipesToCreate.map(recipeItem => ({
            recipeId: recipeItem.recipeId,
            rows: recipeSectionRequestToRows(recipeItem),
        }));
        // TODO flatten loop by allowing saveSectionRows to accept array of requests
        for (const { recipeId, rows } of recipesSections) {
            if (rows) await saveSectionRows(db, { recipeId, sections: rows });
        }

        // const ingredientRows = recipesToCreate.flatMap(ingredientsRequestToRows).filter(Undefined);
        // if (ingredientRows.length) {
        //     await IngredientActions.save(db, ingredientRows);
        // }

        const recipesIngredients = recipesToCreate.map(recipeItem => ({
            recipeId: recipeItem.recipeId,
            rows: recipeIngredientsRequestToRows(recipeItem),
        }));
        for (const { recipeId, rows } of recipesIngredients) {
            if (rows) await saveRecipeIngredientRows(db, { recipeId, ingredients: rows });
        }

        const recipesSteps = recipesToCreate.map(recipeItem => ({
            recipeId: recipeItem.recipeId,
            rows: recipeMethodRequestToRows(recipeItem),
        }));
        for (const { recipeId, rows } of recipesSteps) {
            if (rows) await saveRecipeStepRows(db, { recipeId, recipeSteps: rows });
        }

        const recipesTags = recipesToCreate.map(({ recipeId, tags }) => ({
            recipeId,
            rows: ContentTagsRequestToRows(recipeId, tags ?? []),
        }));
        for (const { recipeId, rows } of recipesTags) {
            if (rows) await saveTags(db, { recipeId, tags: rows });
        }

        const recipeRatingRows = recipesToCreate
            .map(({ recipeId, rating }): RecipeRating | undefined =>
                rating ? { raterId: userId, rating, recipeId } : undefined
            )
            .filter(Undefined);
        if (recipeRatingRows.length) {
            await db<RecipeRating>(lamington.recipeRating)
                .insert(recipeRatingRows)
                .onConflict(["recipeId", "raterId"])
                .merge();
        }

        const results = await read(db, { userId, recipes: recipesToCreate });

        return { userId, recipes: results.recipes };
    },
    update: async (db, { userId, recipes }) => {
        await db<Recipe>(lamington.recipe)
            .insert(
                recipes.map(recipe => ({
                    name: recipe.name,
                    public: recipe.public,
                    recipeId: recipe.recipeId,
                    cookTime: recipe.cookTime,
                    nutritionalInformation: recipe.nutritionalInformation,
                    prepTime: recipe.prepTime,
                    servings: recipe.servings,
                    source: recipe.source,
                    summary: recipe.summary,
                    timesCooked: recipe.timesCooked,
                    tips: recipe.tips,
                }))
            )
            .onConflict("recipeId")
            .merge();

        const recipesSections = recipes.map(recipeItem => ({
            recipeId: recipeItem.recipeId,
            rows: recipeSectionRequestToRows(recipeItem),
        }));
        for (const { recipeId, rows } of recipesSections) {
            if (rows) await saveSectionRows(db, { recipeId, sections: rows });
        }

        // TODO: verify if approach is to move away from this and then remove related code
        // const ingredientRows = recipes.flatMap(ingredientsRequestToRows).filter(Undefined);
        // if (ingredientRows.length) {
        //     await IngredientActions.save(db, ingredientRows);
        // }

        const recipesIngredients = recipes.map(recipeItem => ({
            recipeId: recipeItem.recipeId,
            rows: recipeIngredientsRequestToRows(recipeItem),
        }));
        for (const { recipeId, rows } of recipesIngredients) {
            if (rows) await saveRecipeIngredientRows(db, { recipeId, ingredients: rows });
        }

        const recipesSteps = recipes.map(recipeItem => ({
            recipeId: recipeItem.recipeId,
            rows: recipeMethodRequestToRows(recipeItem),
        }));
        for (const { recipeId, rows } of recipesSteps) {
            if (rows) await saveRecipeStepRows(db, { recipeId, recipeSteps: rows });
        }

        const recipesTags = recipes.map(({ recipeId, tags }) => ({
            recipeId,
            rows: ContentTagsRequestToRows(recipeId, tags ?? []),
        }));
        for (const { recipeId, rows } of recipesTags) {
            if (rows) await saveTags(db, { recipeId, tags: rows });
        }

        const recipeRatingRows = recipes
            .map(({ recipeId, rating }): RecipeRating | undefined =>
                rating ? { raterId: userId, rating, recipeId } : undefined
            )
            .filter(Undefined);
        if (recipeRatingRows.length) {
            await db<RecipeRating>(lamington.recipeRating)
                .insert(recipeRatingRows)
                .onConflict(["recipeId", "raterId"])
                .merge();
        }

        const results = await read(db, { userId, recipes });

        return { userId, recipes: results.recipes };
    },
    verifyPermissions: async (db, { userId, recipes }) => {
        const recipeOwners = await db(lamington.recipe)
            .select("recipeId", "createdBy")
            .leftJoin(lamington.content, content.contentId, recipe.recipeId)
            .where({ [content.createdBy]: userId })
            .whereIn(
                recipe.recipeId,
                recipes.map(({ recipeId }) => recipeId)
            );

        const permissionMap = Object.fromEntries(recipeOwners.map(recipe => [recipe.recipeId, true]));

        return {
            userId,
            recipes: recipes.map(({ recipeId }) => ({ recipeId, hasPermissions: permissionMap[recipeId] ?? false })),
        };
    },
    readAll: async (db, { userId, order, page = 1, sort = "name", filter = {} }) => {
        const sortColumn = {
            name: recipe.name,
            ratingPersonal: ratingPersonalName,
            ratingAverage: ratingAverageName,
            cookTime: recipe.cookTime,
        }[sort];

        const query = RecipeBase(db, userId)
            .where(builder => {
                if (!filter.name) return;
                return builder.where(recipe.name, "ILIKE", `%${filter.name}%`);
            })

            .where(builder => {
                builder.where({ [content.createdBy]: userId }).orWhere({ [recipe.public]: true });

                if (!filter.owner) return builder;

                return builder.andWhere({ [content.createdBy]: filter.owner });
            })
            .where(builder => {
                if (!filter.tags?.length) return;
                return builder.whereIn(
                    recipe.recipeId,
                    db
                        .select(contentTag.contentId)
                        .from(lamington.contentTag)
                        .whereIn(
                            contentTag.tagId,
                            filter.tags.map(({ tagId }) => tagId)
                        )
                );
            })
            // .where(builder => {
            //     if (!filter.ingredients?.length) return;
            //     return builder.whereIn(
            //         recipe.recipeId,
            //         db
            //             .select(recipeIngredient.recipeId)
            //             .from(lamington.recipeIngredient)
            //             .whereIn(
            //                 recipeIngredient.description,
            //                 filter.ingredients.map(({ name }) => name)
            //             )
            //             .groupBy(recipeIngredient.recipeId)
            //     );
            // })
            .orderBy([{ column: sortColumn, order }, recipe.recipeId])
            .limit(PAGE_SIZE + 1)
            .offset((page - 1) * PAGE_SIZE);

        if (filter.books?.length) {
            query.leftJoin(lamington.bookRecipe, recipe.recipeId, bookRecipe.recipeId).whereIn(
                bookRecipe.bookId,
                filter.books.map(({ bookId }) => bookId)
            );
        }

        const recipeList = await query;

        let nextPage: number | undefined;
        if (recipeList.length > PAGE_SIZE) {
            nextPage = page + 1;
            recipeList.pop();
        }

        const recipeCategoriesList = await readTags(db, recipeList);

        return {
            userId,
            nextPage,
            recipes: recipeList.map(
                ({
                    [ratingAverageName]: ratingAverage,
                    [ratingPersonalName]: ratingPersonal,
                    heroAttachmentId,
                    heroAttachmentUri,
                    ...recipe
                }) => ({
                    ...recipe,
                    ratingAverage: parseFloat(ratingAverage),
                    ratingPersonal,
                    tags: ContentTagRowsToResponse(
                        recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId)
                    ),
                    attachments: heroAttachmentId
                        ? { hero: { attachmentId: heroAttachmentId, uri: heroAttachmentUri } }
                        : undefined,
                    owner: { userId: recipe.createdBy, firstName: recipe.createdByName },
                })
            ),
        };
    },
    read,
    delete: async (db, { recipes }) => {
        const count = await db(lamington.content)
            .whereIn(
                content.contentId,
                recipes.map(({ recipeId }) => recipeId)
            )
            .delete();
        return { count };
    },
    saveRating: async (db, { userId, ratings }) => {
        const savedRatings = await db<RecipeRating>(lamington.recipeRating)
            .insert(ratings.map(({ rating, recipeId }) => ({ rating, recipeId, raterId: userId })))
            .onConflict(["recipeId", "raterId"])
            .merge()
            .returning(["recipeId", "rating"]);

        return {
            userId,
            ratings: savedRatings,
        };
    },
};

export const recipeSectionRequestToRows = ({
    recipeId,
    ingredients = [],
    method = [],
}: Parameters<RecipeRepository["update"]>["1"]["recipes"][number] & { recipeId: string }):
    | Array<RecipeSection>
    | undefined => {
    const ingSectionRequests: Array<RecipeSection> = ingredients.map(({ sectionId, name, description }, index) => ({
        sectionId,
        recipeId,
        name,
        description,
        index,
    }));
    const methodSectionRequests: Array<RecipeSection> = method.map(({ sectionId, name, description }, index) => ({
        sectionId,
        recipeId,
        name,
        description,
        index,
    }));

    const sectionRequests = [...ingSectionRequests, ...methodSectionRequests];

    // Recipes used to be saved with the default ingredient and method sections sharing the same id.
    // Postgres does not sup[port multiple updates to the same row in one query so only one section data will be saved.
    // This should be fine as these default sections don't currently have any customisation.
    const uniqueSections = Array.from(new Set(sectionRequests.map(({ sectionId }) => sectionId)))
        .map(sectionId => sectionRequests.find(({ sectionId: id }) => id === sectionId))
        .filter(Undefined);

    if (!uniqueSections.length) return;

    return uniqueSections;
};

export const ingredientsRequestToRows = ({
    owner,
    ingredients,
}: Parameters<RecipeRepository["create"]>["1"]["recipes"][number] & { owner: string }):
    | Array<Partial<Ingredient & { createdBy: Content["createdBy"] }>>
    | undefined => {
    if (!ingredients?.length) return;

    return ingredients
        .flatMap(({ items }) => items)
        .map(({ ingredientId, name, ...item }): (Ingredient & { createdBy: Content["createdBy"] }) | undefined => {
            if (!ingredientId || !name) return undefined;

            return {
                ingredientId,
                name,
                ...item,
                description: undefined,
                createdBy: owner,
            };
        })
        .filter(Undefined);
};

export const recipeIngredientsRequestToRows = ({
    recipeId,
    ingredients,
}: Parameters<RecipeRepository["update"]>["1"]["recipes"][number]): RecipeIngredient[] | undefined => {
    if (!ingredients?.length) return;

    return ingredients.flatMap(({ sectionId, items }) =>
        items
            .map((ingItem, index) => {
                if (!ingItem.ingredientId && !ingItem.subrecipeId) return undefined;
                return {
                    id: ingItem.id,
                    recipeId,
                    subrecipeId: ingItem.subrecipeId,
                    sectionId,
                    index,
                    description: ingItem.description,
                    unit: ingItem.unit,
                    amount: ingItem.amount,
                    multiplier: ingItem.multiplier,
                };
            })
            .filter(Undefined)
    );
};

export const recipeMethodRequestToRows = ({
    recipeId,
    method,
}: {
    recipeId: string;
    method?: RecipeMethod;
}): RecipeStep[] | undefined => {
    if (!method?.length) return;

    return method.flatMap(({ sectionId, items }) =>
        items.map(({ id, description }, index): RecipeStep => ({ id, recipeId, sectionId, index, description }))
    );
};

const recipeIngredientRowsToResponse = ({ sections, ingredients }: any): any => {
    const recipeIngredients: any = (sections as any[])
        .sort((a, b) => (a.name === DefaultSection ? -1 : a.index - b.index))
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: ingredients
                .filter((ingredient: any) => ingredient.sectionId === sectionId)
                .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0)),
        }))
        .filter(({ items, name }) => (name === DefaultSection ? true : items.length));

    return recipeIngredients;
};

const recipeStepRowsToResponse = ({ sections, method }: any): any => {
    const recipeMethod: any = (sections as any[])
        .sort((a, b) => (a.name === DefaultSection ? -1 : a.index - b.index))
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: method
                .filter((method: any) => method.sectionId === sectionId)
                .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0)),
        }))
        .filter(({ items, name }) => (name === DefaultSection ? true : items.length));

    return recipeMethod;
};

const ContentTagRowsToResponse = (tags: any): any => {
    const groupedTags: any = tags.reduce((acc: any, { tagId, parentId, name }: any) => {
        if (parentId) {
            acc[parentId] = {
                ...acc[parentId],
                tagId: parentId,
                tags: [...(acc[parentId]?.tags ?? []), { tagId, name }],
            };
        } else {
            acc[tagId] = {
                ...acc[tagId],
                tagId,
                name,
            };
        }
        return acc;
    }, {} as any);

    return ObjectFromEntries(
        groupedTags,
        data =>
            data.map(([id, value]) => (value.tags?.length ? [id, value] : undefined)).filter(Undefined) as unknown as [
                string,
                any
            ][]
    );
};
