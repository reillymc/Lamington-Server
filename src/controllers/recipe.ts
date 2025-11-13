import db, {
    PAGE_SIZE,
    type ReadService,
    type Recipe,
    type RecipeRating,
    type ServiceResponse,
    type User,
    bookRecipe,
    ingredient,
    lamington,
    recipe,
    recipeIngredient,
    recipeRating,
    contentTag,
    user,
} from "../database/index.ts";

import { IngredientActions } from "./ingredient.ts";
import { RecipeIngredientActions } from "./recipeIngredient.ts";
import { RecipeRatingActions } from "./recipeRating.ts";
import { RecipeSectionActions } from "./recipeSection.ts";
import { RecipeStepActions } from "./recipeStep.ts";

import { validate } from "uuid";
import { BisectOnPredicate, EnsureArray, Undefined } from "../utils/index.ts";
import {
    ingredientsRequestToRows,
    processPagination,
    recipeIngredientsRequestToRows,
    recipeMethodRequestToRows,
    recipeSectionRequestToRows,
    ContentTagsRequestToRows,
} from "./helpers/index.ts";
import type { RecipeService } from "./spec/index.ts";
import { content, type Content } from "../database/definitions/content.ts";
import { RecipeTagActions } from "./recipeTag.ts";
import { RecipeAttachmentActions } from "./recipeAttachment.ts";
import { contentAttachment } from "../database/definitions/contentAttachment.ts";
import { attachment } from "../database/definitions/attachment.ts";

const ratingPersonalName = "rating_personal";
const ratingAverageName = "rating_average";

const RecipeBase = (userId: string) => {
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
        .leftJoin(lamington.recipeRating, recipe.recipeId, recipeRating.recipeId)
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

const read: RecipeService["Read"] = async params => {
    const recipeRequests = EnsureArray(params);

    const response: ServiceResponse<RecipeService, "Read">[] = [];

    for (const { recipeId, userId } of recipeRequests) {
        // Fetch from database
        const [recipe, tags, { result: ingredients }, method, { result: sections }, attachments] = await Promise.all([
            getFullRecipe(recipeId, userId),
            RecipeTagActions.readByRecipeId({ recipeId }),
            RecipeIngredientActions.queryByRecipeId({ recipeId }),
            RecipeStepActions.readByRecipeId(recipeId),
            RecipeSectionActions.queryByRecipeId({ recipeId }),
            RecipeAttachmentActions.read({ recipeId }),
        ]);

        if (!recipe) continue;

        const { [ratingAverageName]: ratingAverage, [ratingPersonalName]: ratingPersonal, ...recipeData } = recipe;

        const result: ServiceResponse<RecipeService, "Read"> = {
            ...recipeData,
            ratingAverage: parseFloat(ratingAverage),
            ratingPersonal,
            ingredients,
            method,
            sections,
            tags,
            attachments,
        };

        response.push(result);
    }

    return response;
};

const query: RecipeService["Query"] = async ({
    page = 1,
    search,
    sort = "name",
    order = "asc",
    categoryGroups,
    ingredients = [],
    userId,
}) => {
    // Fetch from database
    const sortColumn = {
        name: recipe.name,
        ratingPersonal: ratingPersonalName,
        ratingAverage: ratingAverageName,
        time: recipe.cookTime,
    }[sort];

    const categories = Object.entries(categoryGroups ?? {});

    const [ingredientIds, ingredientNames] = BisectOnPredicate(ingredients, validate);

    const recipeList = await RecipeBase(userId)
        .where(builder => (search ? builder.where(recipe.name, "ILIKE", `%${search}%`) : undefined))
        .where(builder => builder.where({ [recipe.public]: true }).orWhere({ [content.createdBy]: userId }))
        .where(builder => {
            if (!categories.length) return undefined;

            categories.forEach(([_, categoryIds]) => {
                builder.whereIn(
                    recipe.recipeId,
                    db.select(contentTag.contentId).from(lamington.contentTag).whereIn(contentTag.tagId, categoryIds)
                );
            });

            return builder;
        })
        .where(builder =>
            ingredients.length
                ? builder.whereIn(
                      recipe.recipeId,
                      db
                          .select(recipeIngredient.recipeId)
                          .from(lamington.recipeIngredient)
                          .whereIn(recipeIngredient.ingredientId, ingredientIds)
                          .orWhereIn(ingredient.name, ingredientNames)
                          .leftJoin(lamington.ingredient, ingredient.ingredientId, recipeIngredient.ingredientId)
                          .groupBy(recipeIngredient.recipeId)
                  )
                : undefined
        )
        .orderBy([{ column: sortColumn, order }, recipe.recipeId])
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);

    const { result: items, nextPage } = processPagination(recipeList, page);

    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(items);

    // Process results
    const result = recipeList.map(
        ({
            [ratingAverageName]: ratingAverage,
            [ratingPersonalName]: ratingPersonal,
            heroAttachmentUri,
            heroAttachmentId,
            ...recipe
        }): ServiceResponse<RecipeService, "Query"> => ({
            ...recipe,
            ratingAverage: parseFloat(ratingAverage),
            ratingPersonal,
            tags: recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId),
            attachments: heroAttachmentId
                ? { hero: { attachmentId: heroAttachmentId, uri: heroAttachmentUri } }
                : undefined,
        })
    );

    return { result, nextPage };
};

const queryByUser: RecipeService["QueryByUser"] = async ({
    page = 1,
    search,
    sort = "name",
    order = "asc",
    categoryGroups,
    ingredients = [],
    userId,
}) => {
    // Fetch from database

    const sortColumn = {
        name: recipe.name,
        ratingPersonal: ratingPersonalName,
        ratingAverage: ratingAverageName,
        time: recipe.cookTime,
    }[sort];

    const categories = Object.entries(categoryGroups ?? {});

    const [ingredientIds, ingredientNames] = BisectOnPredicate(ingredients, validate);

    const recipeList = await RecipeBase(userId)
        .where(builder => (search ? builder.where(recipe.name, "ILIKE", `%${search}%`) : undefined))
        .where({ [content.createdBy]: userId })
        .where(builder => {
            if (!categories.length) return undefined;

            categories.forEach(([_, categoryIds]) => {
                builder.whereIn(
                    recipe.recipeId,
                    db.select(contentTag.contentId).from(lamington.contentTag).whereIn(contentTag.tagId, categoryIds)
                );
            });

            return builder;
        })
        .where(builder =>
            ingredients.length
                ? builder.whereIn(
                      recipe.recipeId,
                      db
                          .select(recipeIngredient.recipeId)
                          .from(lamington.recipeIngredient)
                          .whereIn(recipeIngredient.ingredientId, ingredientIds)
                          .orWhereIn(ingredient.name, ingredientNames)
                          .leftJoin(lamington.ingredient, ingredient.ingredientId, recipeIngredient.ingredientId)
                          .groupBy(recipeIngredient.recipeId)
                  )
                : undefined
        )
        .orderBy([{ column: sortColumn, order }, recipe.recipeId])
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);

    let nextPage: number | undefined;
    if (recipeList.length > PAGE_SIZE) {
        nextPage = page + 1;
        recipeList.pop();
    }

    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(recipeList);

    // Process results
    const result = recipeList.map(
        ({
            [ratingAverageName]: ratingAverage,
            [ratingPersonalName]: ratingPersonal,
            heroAttachmentId,
            heroAttachmentUri,
            ...recipe
        }): ServiceResponse<RecipeService, "QueryByUser"> => ({
            ...recipe,
            ratingAverage: parseFloat(ratingAverage),
            ratingPersonal,
            tags: recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId),
            attachments: heroAttachmentId
                ? { hero: { attachmentId: heroAttachmentId, uri: heroAttachmentUri } }
                : undefined,
        })
    );

    return { result, nextPage };
};

const queryByBook: RecipeService["QueryByBook"] = async ({ bookId, page, search, sort, userId }) => {
    const recipeList = await RecipeBase(userId)
        .leftJoin(lamington.bookRecipe, recipe.recipeId, bookRecipe.recipeId)
        .where({ [bookRecipe.bookId]: bookId });

    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(recipeList);

    // Process results
    const result = recipeList.map(
        ({
            [ratingAverageName]: ratingAverage,
            [ratingPersonalName]: ratingPersonal,
            heroAttachmentUri,
            heroAttachmentId,
            ...recipe
        }): ServiceResponse<RecipeService, "QueryByBook"> => ({
            ...recipe,
            ratingAverage: parseFloat(ratingAverage),
            ratingPersonal,
            tags: recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId),
            attachments: heroAttachmentId
                ? { hero: { attachmentId: heroAttachmentId, uri: heroAttachmentUri } }
                : undefined,
        })
    );

    return { result };
};

/**
 * Creates new recipes or updates existing ones
 *
 * Insecure - route authentication check required (user save permission on recipes)
 */
const save: RecipeService["Save"] = async params => {
    const recipes = EnsureArray(params);

    const recipeData = recipes.map(
        ({ ingredients, method, tags, ratingPersonal, createdBy, ...recipeItem }) => recipeItem
    );

    await db<Content>(lamington.content)
        .insert(
            recipes.map(({ recipeId, createdBy }) => ({
                contentId: recipeId,
                createdBy,
            }))
        )
        .onConflict("contentId")
        .merge();

    await db<Recipe>(lamington.recipe).insert(recipeData).onConflict("recipeId").merge();

    // Create new RecipeSections rows
    const recipesSections = recipes.map(recipeItem => ({
        recipeId: recipeItem.recipeId,
        rows: recipeSectionRequestToRows(recipeItem),
    }));

    for (const { recipeId, rows } of recipesSections) {
        if (rows) await RecipeSectionActions.save({ recipeId, sections: rows });
    }

    // Create new Ingredients rows
    const ingredientRows = recipes.flatMap(ingredientsRequestToRows).filter(Undefined);
    if (ingredientRows) {
        await IngredientActions.save(ingredientRows);
    }

    // Update RecipeIngredients rows
    const recipesIngredients = recipes.map(recipeItem => ({
        recipeId: recipeItem.recipeId,
        rows: recipeIngredientsRequestToRows(recipeItem),
    }));
    for (const { recipeId, rows } of recipesIngredients) {
        if (rows) await RecipeIngredientActions.save({ recipeId, ingredients: rows });
    }

    // Update RecipeSteps rows
    const recipesSteps = recipes.map(recipeItem => ({
        recipeId: recipeItem.recipeId,
        rows: recipeMethodRequestToRows(recipeItem),
    }));
    for (const { recipeId, rows } of recipesSteps) {
        if (rows) await RecipeStepActions.save(recipeId, rows);
    }

    // Update ContentTags rows
    const recipesTags = recipes.map(({ recipeId, tags }) => ({
        recipeId,
        rows: ContentTagsRequestToRows(recipeId, tags),
    }));
    for (const { recipeId, rows } of recipesTags) {
        if (rows) await RecipeTagActions.save({ recipeId, tags: rows });
    }

    // Update Recipe Rating row
    const recipeRatingRows = recipes
        .map(({ recipeId, createdBy, ratingPersonal }): RecipeRating | undefined =>
            ratingPersonal ? { raterId: createdBy, rating: ratingPersonal, recipeId } : undefined
        )
        .filter(Undefined);
    if (recipeRatingRows.length) await RecipeRatingActions.save(recipeRatingRows);

    return [];
};

const deleteRecipe: RecipeService["Delete"] = async params =>
    db(lamington.recipe)
        .whereIn(
            recipe.recipeId,
            EnsureArray(params).map(({ recipeId }) => recipeId)
        )
        .delete();

const readInternal: ReadService<
    {
        recipeId: Recipe["recipeId"];
        createdBy: Content["createdBy"];
    },
    "recipeId"
> = async params => {
    const recipeIds = EnsureArray(params).map(({ recipeId }) => recipeId);

    const query = db(lamington.recipe)
        .select("recipeId", "createdBy")
        .leftJoin(lamington.content, content.contentId, recipe.recipeId)
        .whereIn(recipe.recipeId, recipeIds);

    return query;
};

export const RecipeActions: RecipeService = {
    Delete: deleteRecipe,
    Save: save,
    Read: read,
    Query: query,
    QueryByUser: queryByUser,
    QueryByBook: queryByBook,
    ReadSummary: readInternal,
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
      > & {
          [ratingAverageName]: string;
          [ratingPersonalName]: RecipeRating["rating"];
          createdByName: User["firstName"];
          createdBy: Content["createdBy"];
      })
    | undefined;

const getFullRecipe = async (recipeId: string, userId: string): Promise<GetFullRecipeResults> => {
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
