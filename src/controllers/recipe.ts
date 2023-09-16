import db, {
    Alias,
    lamington,
    recipe,
    Recipe,
    recipeRating,
    RecipeRating,
    user,
    User,
    bookRecipe,
    PAGE_SIZE,
    SaveService,
    ReadService,
    QueryService,
    DeleteService,
    Book,
    recipeTag,
    recipeIngredient,
} from "../database";

import { RecipeIngredients, RecipeMethod, RecipeTags } from "../routes/spec";

import { IngredientActions } from "./ingredient";
import { RecipeIngredientActions } from "./recipeIngredient";
import { RecipeRatingActions } from "./recipeRating";
import { RecipeSectionActions } from "./recipeSection";
import { RecipeStepActions } from "./recipeStep";
import { RecipeTagActions } from "./recipeTag";

import {
    ingredientsRequestToRows,
    processPagination,
    recipeIngredientRowsToResponse,
    recipeIngredientsRequestToRows,
    recipeMethodRequestToRows,
    recipeSectionRequestToRows,
    recipeStepRowsToResponse,
    recipeTagRowsToResponse,
    recipeTagsRequestToRows,
} from "./helpers";
import { EnsureArray, Undefined } from "../utils";

type ReadRecipeResponse = Pick<
    Recipe,
    "recipeId" | "name" | "photo" | "timesCooked" | "cookTime" | "prepTime" | "dateCreated" | "dateUpdated"
> & {
    public: boolean;
    ratingAverage: RecipeRating["rating"];
    ratingPersonal: RecipeRating["rating"];
    ingredients: RecipeIngredients;
    method: RecipeMethod;
    tags: RecipeTags;
    createdBy: Pick<User, "userId" | "firstName">;
};

const read: ReadService<ReadRecipeResponse, "recipeId", Pick<User, "userId">> = async params => {
    const recipeRequests = EnsureArray(params);

    const response: ReadRecipeResponse[] = [];

    for (const { recipeId, userId } of recipeRequests) {
        // Fetch from database
        const [recipe, tagRows, { result: ingredientRows }, methodRows, { result: sectionRows }] = await Promise.all([
            getFullRecipe(recipeId, userId),
            RecipeTagActions.readByRecipeId(recipeId),
            RecipeIngredientActions.queryByRecipeId({ recipeId }),
            RecipeStepActions.readByRecipeId(recipeId),
            RecipeSectionActions.queryByRecipeId({ recipeId }),
        ]);

        if (!recipe) continue;

        // Process results
        const ingredients = recipeIngredientRowsToResponse(ingredientRows, sectionRows);
        const method = recipeStepRowsToResponse(methodRows, sectionRows);
        const tags = recipeTagRowsToResponse(tagRows);

        const result: ReadRecipeResponse = {
            ...recipe,
            ratingAverage: parseFloat(recipe.ratingAverage),
            ingredients,
            method,
            tags,
            public: recipe.public === 1,
            createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
        };

        response.push(result);
    }

    return response;
};

type QueryRecipesResult = Pick<
    Recipe,
    "recipeId" | "name" | "photo" | "timesCooked" | "cookTime" | "prepTime" | "dateCreated"
> & {
    public: boolean;
    ratingAverage: RecipeRating["rating"];
    ratingPersonal: RecipeRating["rating"];
    tags: RecipeTags;
    createdBy: Pick<User, "userId" | "firstName">;
};

type RecipeQueryItem = Pick<
    Recipe,
    "recipeId" | "name" | "photo" | "timesCooked" | "cookTime" | "prepTime" | "public" | "createdBy" | "dateCreated"
> & {
    createdByName: User["firstName"];
    ratingAverage: string;
    ratingPersonal: RecipeRating["rating"];
};

type RecipeQuerySortOptions = "name" | "ratingPersonal" | "ratingAverage" | "time";

const query: QueryService<
    QueryRecipesResult,
    Pick<User, "userId"> & { categoryGroups?: Record<string, string[]>; ingredients?: string[] },
    RecipeQuerySortOptions
> = async ({ page = 1, search, sort = "name", order = "asc", categoryGroups, ingredients, userId }) => {
    // Fetch from database
    const recipeAliasName = "recipe_1";
    const recipeAlias = Alias(recipe, lamington.recipe, recipeAliasName);

    const recipeRatingAliasName = "recipe_rating_1";
    const recipeRatingAlias = Alias(recipeRating, lamington.recipeRating, recipeRatingAliasName);
    const ratingPersonalName = "ratingPersonal";
    const ratingAverageName = "ratingAverage";

    const sortColumn = {
        name: recipeAlias.name,
        ratingPersonal: ratingPersonalName,
        ratingAverage: ratingAverageName,
        time: recipeAlias.cookTime,
    }[sort];

    const categories = Object.entries(categoryGroups ?? {});

    const recipeList: RecipeQueryItem[] = await db<RecipeQueryItem>(`${lamington.recipe} as ${recipeAliasName}`)
        .select(
            recipeAlias.recipeId,
            recipeAlias.name,
            recipeAlias.photo,
            recipeAlias.timesCooked,
            recipeAlias.cookTime,
            recipeAlias.prepTime,
            recipeAlias.public,
            recipeAlias.createdBy,
            recipeAlias.dateCreated,
            `${user.firstName} as createdByName`,
            db.raw(`COALESCE(ROUND(AVG(${recipeRating.rating}),1), 0) AS ${ratingAverageName}`),
            db
                .select(recipeRatingAlias.rating)
                .from(`${lamington.recipeRating} as ${recipeRatingAliasName}`)
                .where({
                    [recipeAlias.recipeId]: db.raw(recipeRatingAlias.recipeId),
                    [recipeRatingAlias.raterId]: userId,
                })
                .join(lamington.recipe, recipeAlias.recipeId, recipeRatingAlias.recipeId)
                .groupBy(recipeAlias.recipeId)
                .as(ratingPersonalName)
        )
        .leftJoin(lamington.recipeRating, recipeAlias.recipeId, recipeRating.recipeId)
        .leftJoin(lamington.user, recipeAlias.createdBy, user.userId)
        .groupBy(recipeAlias.recipeId)
        .where(builder => (search ? builder.where(recipeAlias.name, "like", `%${search}%`) : undefined))
        .where(builder => builder.where({ [recipeAlias.public]: 1 }).orWhere({ [recipeAlias.createdBy]: userId }))
        .where(builder => {
            if (!categories.length) return undefined;

            categories.forEach(([_, categoryIds]) => {
                builder.whereIn(
                    recipeAlias.recipeId,
                    db.select(recipeTag.recipeId).from(lamington.recipeTag).whereIn(recipeTag.tagId, categoryIds)
                );
            });

            return builder;
        })
        .where(builder =>
            ingredients?.length
                ? builder.whereIn(
                      recipeAlias.recipeId,
                      db
                          .select(recipeIngredient.recipeId)
                          .from(lamington.recipeIngredient)
                          .whereIn(recipeIngredient.ingredientId, ingredients)
                          .groupBy(recipeIngredient.recipeId)
                  )
                : undefined
        )
        .orderBy([{ column: sortColumn, order }, recipeAlias.recipeId])
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);

    const { result: items, nextPage } = processPagination(recipeList, page);

    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(items.map(({ recipeId }) => recipeId));

    // Process results
    const result = items.map(
        (recipe): QueryRecipesResult => ({
            ...recipe,
            ratingAverage: parseFloat(recipe.ratingAverage),
            tags: recipeTagRowsToResponse(
                recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId)
            ),
            public: recipe.public === 1,
            createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
        })
    );

    return { result, nextPage };
};

const queryByUser: QueryService<
    QueryRecipesResult,
    Pick<User, "userId"> & { categoryGroups?: Record<string, string[]>; ingredients?: string[] },
    RecipeQuerySortOptions
> = async ({ page = 1, search, sort = "name", order = "asc", categoryGroups, ingredients, userId }) => {
    // Fetch from database
    const recipeAliasName = "m1";
    const recipeAlias = Alias(recipe, lamington.recipe, recipeAliasName);

    const recipeRatingAliasName = "mr1";
    const recipeRatingAlias = Alias(recipeRating, lamington.recipeRating, recipeRatingAliasName);
    const ratingPersonalName = "ratingPersonal";
    const ratingAverageName = "ratingAverage";

    const sortColumn = {
        name: recipeAlias.name,
        ratingPersonal: ratingPersonalName,
        ratingAverage: ratingAverageName,
        time: recipeAlias.cookTime,
    }[sort];

    const categories = Object.entries(categoryGroups ?? {});

    const recipeList: RecipeQueryItem[] = await db
        .from(`${lamington.recipe} as ${recipeAliasName}`)
        .where({ [recipeAlias.createdBy]: userId })
        .select(
            recipeAlias.recipeId,
            recipeAlias.name,
            recipeAlias.photo,
            recipeAlias.timesCooked,
            recipeAlias.cookTime,
            recipeAlias.prepTime,
            recipeAlias.public,
            recipeAlias.createdBy,
            recipeAlias.dateCreated,
            `${user.firstName} as createdByName`,
            db.raw(`COALESCE(ROUND(AVG(${recipeRating.rating}),1), 0) AS ${ratingAverageName}`),
            db
                .select(recipeRatingAlias.rating)
                .from(`${lamington.recipeRating} as ${recipeRatingAliasName}`)
                .where({
                    [recipeAlias.recipeId]: db.raw(recipeRatingAlias.recipeId),
                    [recipeRatingAlias.raterId]: userId,
                })
                .join(lamington.recipe, recipeAlias.recipeId, recipeRatingAlias.recipeId)
                .groupBy(recipeAlias.recipeId)
                .as(ratingPersonalName)
        )
        .leftJoin(lamington.recipeRating, recipeAlias.recipeId, recipeRating.recipeId)
        .leftJoin(lamington.user, recipeAlias.createdBy, user.userId)
        .groupBy(recipeAlias.recipeId)
        .where(builder => (search ? builder.where(recipeAlias.name, "like", `%${search}%`) : undefined))
        .where(builder => {
            if (!categories.length) return undefined;

            categories.forEach(([_, categoryIds]) => {
                builder.whereIn(
                    recipeAlias.recipeId,
                    db.select(recipeTag.recipeId).from(lamington.recipeTag).whereIn(recipeTag.tagId, categoryIds)
                );
            });

            return builder;
        })
        .where(builder =>
            ingredients?.length
                ? builder.whereIn(
                      recipeAlias.recipeId,
                      db
                          .select(recipeIngredient.recipeId)
                          .from(lamington.recipeIngredient)
                          .whereIn(recipeIngredient.ingredientId, ingredients)
                          .groupBy(recipeIngredient.recipeId)
                  )
                : undefined
        )
        .orderBy([{ column: sortColumn, order }, recipeAlias.recipeId])
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
        (recipe): QueryRecipesResult => ({
            ...recipe,
            ratingAverage: parseFloat(recipe.ratingAverage),
            tags: recipeTagRowsToResponse(
                recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId)
            ),
            public: recipe.public === 1,
            createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
        })
    );

    return { result, nextPage };
};

const queryByBook: QueryService<QueryRecipesResult, Pick<User, "userId"> & Pick<Book, "bookId">> = async ({
    bookId,
    page,
    search,
    sort,
    userId,
}) => {
    const recipeAliasName = "m1";
    const recipeAlias = Alias(recipe, lamington.recipe, recipeAliasName);

    const recipeRatingAliasName = "mr1";
    const recipeRatingAlias = Alias(recipeRating, lamington.recipeRating, recipeRatingAliasName);

    const recipeList: RecipeQueryItem[] = await db
        .from(`${lamington.recipe} as ${recipeAliasName}`)
        .where({ [bookRecipe.bookId]: bookId })
        .select(
            recipeAlias.recipeId,
            recipeAlias.name,
            recipeAlias.photo,
            recipeAlias.timesCooked,
            recipeAlias.cookTime,
            recipeAlias.prepTime,
            recipeAlias.public,
            recipeAlias.createdBy,
            recipeAlias.dateCreated,
            `${user.firstName} as createdByName`,
            db.raw(`COALESCE(ROUND(AVG(${recipeRating.rating}),1), 0) AS ratingAverage`),
            db.raw(
                `(${db
                    .select(recipeRatingAlias.rating)
                    .from(`${lamington.recipeRating} as ${recipeRatingAliasName}`)
                    .where({
                        [recipeAlias.recipeId]: db.raw(recipeRatingAlias.recipeId),
                        [recipeRatingAlias.raterId]: userId,
                    })
                    .join(lamington.recipe, recipeAlias.recipeId, recipeRatingAlias.recipeId)
                    .groupBy(recipeAlias.recipeId)}) as ratingPersonal`
            )
        )
        .leftJoin(lamington.recipeRating, recipeAlias.recipeId, recipeRating.recipeId)
        .leftJoin(lamington.user, recipeAlias.createdBy, user.userId)
        .leftJoin(lamington.bookRecipe, recipeAlias.recipeId, bookRecipe.recipeId)
        .groupBy(recipeAlias.recipeId);
    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(recipeList.map(({ recipeId }) => recipeId));

    // Process results
    const result: QueryRecipesResult[] = recipeList.map(recipe => ({
        // TODO: Update GetRecipeResponseItem naming
        ...recipe,
        ratingAverage: parseFloat(recipe.ratingAverage),
        tags: recipeTagRowsToResponse(
            recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId)
        ),
        public: recipe.public === 1,
        createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
    }));

    return { result };
};

type SaveRecipe = Omit<Recipe, "dateCreated" | "dateUpdated">;

/**
 * Creates new recipes or updates existing ones
 *
 * Insecure - route authentication check required (user save permission on recipes)
 */
const save: SaveService<
    SaveRecipe & {
        ingredients?: RecipeIngredients;
        method?: RecipeMethod;
        ratingPersonal?: number;
        tags?: RecipeTags;
    }
> = async params => {
    const recipes = EnsureArray(params);

    const recipeData: SaveRecipe[] = recipes.map(
        ({ ingredients, method, tags, ratingPersonal, ...recipeItem }) => recipeItem
    );

    await db(lamington.recipe).insert(recipeData).onConflict(recipe.recipeId).merge();

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

const deleteRecipe: DeleteService<Recipe, "recipeId"> = async params =>
    db(lamington.recipe).whereIn(recipe.recipeId, EnsureArray(params)).delete();

export const RecipeActions = {
    read,
    query,
    queryByUser,
    save,
    delete: deleteRecipe,
    queryByBook,
};

export type RecipeActions = typeof RecipeActions;

const readInternal: ReadService<Recipe, "recipeId"> = async params => {
    const recipeIds = EnsureArray(params).map(({ recipeId }) => recipeId);

    const query = db(lamington.recipe)
        .select(recipe.recipeId, recipe.createdBy, recipe.photo)
        .whereIn(recipe.recipeId, recipeIds);

    return query;
};

export const InternalRecipeActions = {
    read: readInternal,
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
          | "notes"
          | "servings"
          | "source"
          | "dateCreated"
          | "dateUpdated"
      > & {
          ratingAverage: string;
          ratingPersonal: RecipeRating["rating"];
          createdByName: User["firstName"];
      })
    | undefined;

const getFullRecipe = async (recipeId: string, userId: string): Promise<GetFullRecipeResults> => {
    const query = db<Recipe>(lamington.recipe)
        .select(
            recipe.recipeId,
            recipe.name,
            recipe.source,
            recipe.photo,
            recipe.servings,
            recipe.prepTime,
            recipe.cookTime,
            recipe.notes,
            recipe.public,
            recipe.timesCooked,
            recipe.createdBy,
            recipe.dateCreated,
            recipe.dateUpdated,
            `${user.firstName} as createdByName`,
            db.raw(`COALESCE(ROUND(AVG(${recipeRating.rating}),1), 0) AS ratingAverage`),
            db.raw(
                `(${db
                    .select(recipeRating.rating)
                    .from(lamington.recipeRating)
                    .where({ [recipeRating.recipeId]: recipeId, [recipeRating.raterId]: userId })}) as ratingPersonal`
            )
        )
        .where({ [recipe.recipeId]: recipeId })
        .leftJoin(lamington.recipeRating, recipe.recipeId, recipeRating.recipeId)
        .leftJoin(lamington.user, recipe.createdBy, user.userId)
        .groupBy(recipe.recipeId)
        .first();

    return query;
};
