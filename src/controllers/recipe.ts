import db, {
    PAGE_SIZE,
    ReadService,
    Recipe,
    RecipeRating,
    ServiceResponse,
    User,
    bookRecipe,
    lamington,
    recipe,
    recipeIngredient,
    recipeRating,
    recipeTag,
    user,
} from "../database";

import { IngredientActions } from "./ingredient";
import { RecipeIngredientActions } from "./recipeIngredient";
import { RecipeRatingActions } from "./recipeRating";
import { RecipeSectionActions } from "./recipeSection";
import { RecipeStepActions } from "./recipeStep";
import { RecipeTagActions } from "./recipeTag";

import { EnsureArray, Undefined } from "../utils";
import {
    ingredientsRequestToRows,
    processPagination,
    recipeIngredientsRequestToRows,
    recipeMethodRequestToRows,
    recipeSectionRequestToRows,
    recipeTagsRequestToRows,
} from "./helpers";
import { RecipeService } from "./spec";

const ratingPersonalName = "rating_personal";
const ratingAverageName = "rating_average";

const RecipeBase = (userId: string) => {
    const recipeIdRef = db.ref(recipe.recipeId);
    return db<Recipe>(lamington.recipe)
        .select(
            recipeIdRef,
            recipe.name,
            recipe.photo,
            recipe.timesCooked,
            recipe.cookTime,
            recipe.prepTime,
            recipe.public,
            recipe.createdBy,
            recipe.createdAt,
            `${user.firstName} as createdByName`,
            db.raw(`ROUND(AVG(${recipeRating.rating}),1) AS ${ratingAverageName}`),
            db<RecipeRating>(lamington.recipeRating)
                .select(recipeRating.rating)
                .where({
                    [recipeRating.recipeId]: recipeIdRef,
                    [recipeRating.raterId]: userId,
                })
                .groupBy(recipeRating.recipeId, recipeRating.rating)
                .as(ratingPersonalName)
        )
        .leftJoin(lamington.recipeRating, recipe.recipeId, recipeRating.recipeId)
        .leftJoin(lamington.user, recipe.createdBy, user.userId);
};

const read: RecipeService["Read"] = async params => {
    const recipeRequests = EnsureArray(params);

    const response: ServiceResponse<RecipeService, "Read">[] = [];

    for (const { recipeId, userId } of recipeRequests) {
        // Fetch from database
        const [recipe, tags, { result: ingredients }, method, { result: sections }] = await Promise.all([
            getFullRecipe(recipeId, userId),
            RecipeTagActions.readByRecipeId(recipeId),
            RecipeIngredientActions.queryByRecipeId({ recipeId }),
            RecipeStepActions.readByRecipeId(recipeId),
            RecipeSectionActions.queryByRecipeId({ recipeId }),
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
    ingredients,
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

    const recipeList = await RecipeBase(userId)
        .groupBy(recipe.recipeId, user.firstName)
        .where(builder => (search ? builder.where(recipe.name, "ILIKE", `%${search}%`) : undefined))
        .where(builder => builder.where({ [recipe.public]: true }).orWhere({ [recipe.createdBy]: userId }))
        .where(builder => {
            if (!categories.length) return undefined;

            categories.forEach(([_, categoryIds]) => {
                builder.whereIn(
                    recipe.recipeId,
                    db.select(recipeTag.recipeId).from(lamington.recipeTag).whereIn(recipeTag.tagId, categoryIds)
                );
            });

            return builder;
        })
        .where(builder =>
            ingredients?.length
                ? builder.whereIn(
                      recipe.recipeId,
                      db
                          .select(recipeIngredient.recipeId)
                          .from(lamington.recipeIngredient)
                          .whereIn(recipeIngredient.ingredientId, ingredients)
                          .orWhereIn(recipeIngredient.description, ingredients)
                          .groupBy(recipeIngredient.recipeId)
                  )
                : undefined
        )
        .orderBy([{ column: sortColumn, order }, recipe.recipeId])
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);

    const { result: items, nextPage } = processPagination(recipeList, page);

    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(items.map(({ recipeId }) => recipeId));

    // Process results
    const result = recipeList.map(
        ({
            [ratingAverageName]: ratingAverage,
            [ratingPersonalName]: ratingPersonal,
            ...recipe
        }): ServiceResponse<RecipeService, "Query"> => ({
            ...recipe,
            ratingAverage: parseFloat(ratingAverage),
            ratingPersonal,
            tags: recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId),
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
    ingredients,
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

    const recipeList = await RecipeBase(userId)
        .groupBy(recipe.recipeId, user.firstName)
        .where(builder => (search ? builder.where(recipe.name, "ILIKE", `%${search}%`) : undefined))
        .where({ [recipe.createdBy]: userId })
        .where(builder => {
            if (!categories.length) return undefined;

            categories.forEach(([_, categoryIds]) => {
                builder.whereIn(
                    recipe.recipeId,
                    db.select(recipeTag.recipeId).from(lamington.recipeTag).whereIn(recipeTag.tagId, categoryIds)
                );
            });

            return builder;
        })
        .where(builder =>
            ingredients?.length
                ? builder.whereIn(
                      recipe.recipeId,
                      db
                          .select(recipeIngredient.recipeId)
                          .from(lamington.recipeIngredient)
                          .whereIn(recipeIngredient.ingredientId, ingredients)
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

    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(recipeList.map(({ recipeId }) => recipeId));

    // Process results
    const result = recipeList.map(
        ({
            [ratingAverageName]: ratingAverage,
            [ratingPersonalName]: ratingPersonal,
            ...recipe
        }): ServiceResponse<RecipeService, "QueryByUser"> => ({
            ...recipe,
            ratingAverage: parseFloat(ratingAverage),
            ratingPersonal,
            tags: recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId),
        })
    );

    return { result, nextPage };
};

const queryByBook: RecipeService["QueryByBook"] = async ({ bookId, page, search, sort, userId }) => {
    const recipeList = await RecipeBase(userId)
        .leftJoin(lamington.bookRecipe, recipe.recipeId, bookRecipe.recipeId)
        .where({ [bookRecipe.bookId]: bookId })
        .groupBy(recipe.recipeId, user.firstName);

    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(recipeList.map(({ recipeId }) => recipeId));

    // Process results
    const result = recipeList.map(
        ({
            [ratingAverageName]: ratingAverage,
            [ratingPersonalName]: ratingPersonal,
            ...recipe
        }): ServiceResponse<RecipeService, "QueryByBook"> => ({
            ...recipe,
            ratingAverage: parseFloat(ratingAverage),
            ratingPersonal,
            tags: recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId),
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

    const recipeData = recipes.map(({ ingredients, method, tags, ratingPersonal, ...recipeItem }) => recipeItem);

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

    // Update RecipeTags rows
    const recipesTags = recipes.map(({ recipeId, tags }) => ({
        recipeId,
        rows: recipeTagsRequestToRows(recipeId, tags),
    }));
    for (const { recipeId, rows } of recipesTags) {
        if (rows) await RecipeTagActions.save({ recipeId: recipeId, tags: rows });
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

const readInternal: ReadService<Recipe, "recipeId"> = async params => {
    const recipeIds = EnsureArray(params).map(({ recipeId }) => recipeId);

    const query = db(lamington.recipe).select("recipeId", "createdBy", "photo").whereIn(recipe.recipeId, recipeIds);

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
          | "photo"
          | "timesCooked"
          | "cookTime"
          | "prepTime"
          | "public"
          | "createdBy"
          | "tips"
          | "summary"
          | "servings"
          | "source"
          | "createdAt"
          | "updatedAt"
      > & {
          [ratingAverageName]: string;
          [ratingPersonalName]: RecipeRating["rating"];
          createdByName: User["firstName"];
      })
    | undefined;

const getFullRecipe = async (recipeId: string, userId: string): Promise<GetFullRecipeResults> => {
    const recipeIdRef = db.ref(recipe.recipeId) as unknown as Pick<Recipe, "recipeId">; // Override to correct return type

    const query = db<Recipe>(lamington.recipe)
        .select(
            recipeIdRef,
            "name",
            "source",
            "photo",
            "servings",
            "prepTime",
            "cookTime",
            "tips",
            "summary",
            "public",
            "timesCooked",
            "createdBy",
            recipe.createdAt,
            recipe.updatedAt,
            `${user.firstName} as createdByName`,
            db.raw(`ROUND(AVG(${recipeRating.rating}),1) AS ${ratingAverageName}`),
            db<RecipeRating>(lamington.recipeRating)
                .select(recipeRating.rating)
                .where({
                    [recipeRating.recipeId]: recipeIdRef,
                    [recipeRating.raterId]: userId,
                })
                .groupBy(recipeRating.recipeId, recipeRating.rating)
                .as(ratingPersonalName)
        )
        .where({ [recipe.recipeId]: recipeId })
        .leftJoin(lamington.recipeRating, recipe.recipeId, recipeRating.recipeId)
        .leftJoin(lamington.user, recipe.createdBy, user.userId)
        .groupBy(recipeIdRef)
        .groupBy(user.firstName)
        .first();

    return query;
};
