import db, {
    Alias,
    lamington,
    recipe,
    Recipe,
    recipeRating,
    RecipeRating,
    ReadResponse,
    user,
    User,
    bookRecipe,
    PAGE_SIZE,
    SaveService,
    ReadService,
    QueryService,
    DeleteService,
} from "../database";

import { Recipe as GetRecipeResponseItem, RecipeIngredients, RecipeMethod, RecipeTags } from "../routes/spec";

import { IngredientActions } from "./ingredient";
import { RecipeIngredientActions } from "./recipeIngredient";
import { RecipeRatingActions } from "./recipeRating";
import { RecipeSectionActions } from "./recipeSection";
import { RecipeStepActions } from "./recipeStep";
import { RecipeTagActions } from "./recipeTag";

import {
    ingredientsRequestToRows,
    recipeIngredientRowsToResponse,
    recipeIngredientsRequestToRows,
    recipeMethodRequestToRows,
    recipeSectionRequestToRows,
    recipeStepRowsToResponse,
    recipeTagRowsToResponse,
    recipeTagsRequestToRows,
} from "./helpers";
import { EnsureArray, Undefined } from "../utils";

type GetAllRecipesResults = Pick<
    Recipe,
    "recipeId" | "name" | "photo" | "timesCooked" | "cookTime" | "prepTime" | "public" | "createdBy"
> & { ratingAverage: string; createdByName: User["firstName"] };

const getMyRecipes = async (userId: string, page: number): ReadResponse<GetAllRecipesResults> => {
    const recipeAliasName = "m1";
    const recipeAlias = Alias(recipe, lamington.recipe, recipeAliasName);

    const recipeRatingAliasName = "mr1";
    const recipeRatingAlias = Alias(recipeRating, lamington.recipeRating, recipeRatingAliasName);

    const query = db
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
        .groupBy(recipeAlias.recipeId)
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE);

    return query;
};

const getBookRecipes = async (userId: string, bookId: string): ReadResponse<GetAllRecipesResults> => {
    const recipeAliasName = "m1";
    const recipeAlias = Alias(recipe, lamington.recipe, recipeAliasName);

    const recipeRatingAliasName = "mr1";
    const recipeRatingAlias = Alias(recipeRating, lamington.recipeRating, recipeRatingAliasName);

    const query = db
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

    return query;
};

type GetFullRecipeResults = Recipe & { ratingAverage: string; createdByName: User["firstName"] }; // TODO: stop using Table suffix on types here

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

const readInternal: ReadService<Recipe, "recipeId"> = async params => {
    const recipeIds = EnsureArray(params).map(({ recipeId }) => recipeId);

    const query = db(lamington.recipe).select(recipe.createdBy, recipe.photo).whereIn(recipe.recipeId, recipeIds);

    return query;
};

const readByPhoto = async (photo: string): Promise<Array<{ recipeId: string }>> => {
    const query = db(lamington.recipe)
        .select(recipe.recipeId)
        .where({ [recipe.photo]: photo });

    return query;
};

const read = async (recipeId: string, userId: string) => {
    // Fetch from database
    const [recipe, tagRows, ingredientRows, methodRows, sectionRows] = await Promise.all([
        getFullRecipe(recipeId, userId),
        RecipeTagActions.readByRecipeId(recipeId),
        RecipeIngredientActions.readByRecipeId(recipeId),
        RecipeStepActions.readByRecipeId(recipeId),
        RecipeSectionActions.readByRecipeId(recipeId),
    ]);

    // Process results
    const ingredients = recipeIngredientRowsToResponse(ingredientRows, sectionRows);
    const method = recipeStepRowsToResponse(methodRows, sectionRows);
    const tags = recipeTagRowsToResponse(tagRows);

    const result: GetRecipeResponseItem = {
        ...recipe,
        ratingAverage: parseFloat(recipe.ratingAverage),
        ingredients,
        method,
        tags,
        public: recipe.public === 1,
        createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
    };

    return result;
};

type QueryRecipesResult = Pick<Recipe, "recipeId" | "name" | "photo" | "timesCooked" | "cookTime" | "prepTime"> & {
    public: boolean;
    ratingAverage: RecipeRating["rating"];
    ratingPersonal: RecipeRating["rating"];
    tags: RecipeTags;
    createdBy: Pick<User, "userId" | "firstName">;
};

const readAll: QueryService<QueryRecipesResult, { userId: string }> = async ({
    page = 1,
    search,
    sort = "name",
    userId,
}) => {
    // Fetch from database
    const recipeAliasName = "recipe_1";
    const recipeAlias = Alias(recipe, lamington.recipe, recipeAliasName);

    const recipeRatingAliasName = "recipe_rating_1";
    const recipeRatingAlias = Alias(recipeRating, lamington.recipeRating, recipeRatingAliasName);

    const sortColumn = {
        name: recipeAlias.name,
        date: recipeAlias.createdBy,
    }[sort];

    type RecipeQueryItem = Pick<
        Recipe,
        "recipeId" | "name" | "photo" | "timesCooked" | "cookTime" | "prepTime" | "public" | "createdBy"
    > & {
        createdByName: User["firstName"];
        ratingAverage: string;
        ratingPersonal: RecipeRating["rating"];
    };

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
        .where(builder => (search ? builder.where(recipeAlias.name, "like", `%${search}%`) : undefined))
        .where(builder => builder.where({ [recipeAlias.public]: 1 }).orWhere({ [recipeAlias.createdBy]: userId }))
        .groupBy(recipeAlias.recipeId)
        .orderBy([{ column: sortColumn, order: "desc" }, recipeAlias.recipeId])
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE);

    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(recipeList.map(({ recipeId }) => recipeId));

    // Process results
    const data = recipeList.map(
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

    return data;
};

const readMy = async (userId: string, page: number = 1) => {
    // Fetch from database
    const recipeList = await getMyRecipes(userId, page);
    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(recipeList.map(({ recipeId }) => recipeId));

    // Process results
    const data: GetRecipeResponseItem[] = recipeList.map(recipe => ({
        // TODO: Update GetRecipeResponseItem naming
        ...recipe,
        ratingAverage: parseFloat(recipe.ratingAverage),
        tags: recipeTagRowsToResponse(
            recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId)
        ),
        public: recipe.public === 1,
        createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
    }));

    return data;
};

const readByBook = async (userId: string, bookId: string) => {
    // Fetch from database
    const recipeList = await getBookRecipes(userId, bookId);
    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(recipeList.map(({ recipeId }) => recipeId));

    // Process results
    const data: GetRecipeResponseItem[] = recipeList.map(recipe => ({
        // TODO: Update GetRecipeResponseItem naming
        ...recipe,
        ratingAverage: parseFloat(recipe.ratingAverage),
        tags: recipeTagRowsToResponse(
            recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId)
        ),
        public: recipe.public === 1,
        createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
    }));

    return data;
};

/**
 * Creates new recipes or updates existing ones
 *
 * Insecure - route authentication check required (user save permission on recipes)
 */
const save: SaveService<
    Recipe & {
        ingredients?: RecipeIngredients;
        method?: RecipeMethod;
        ratingPersonal?: number;
        tags?: RecipeTags;
    }
> = async params => {
    const recipes = EnsureArray(params);

    const recipeData: Recipe[] = recipes.map(({ ingredients, method, tags, ratingPersonal, ...recipeItem }) => ({
        ...recipeItem,
        public: recipeItem.public ? 1 : 0,
    }));

    await db(lamington.recipe).insert(recipeData).onConflict(recipe.recipeId).merge();

    // Create new RecipeSections rows
    const recipesSections = recipes.map(recipeItem => ({
        recipeId: recipeItem.recipeId,
        rows: recipeSectionRequestToRows(recipeItem),
    }));
    for (const recipeSections of recipesSections) {
        if (recipeSections.rows) await RecipeSectionActions.save(recipeSections.recipeId, recipeSections.rows);
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
    for (const recipeIngredients of recipesIngredients) {
        if (recipeIngredients.rows) {
            await RecipeIngredientActions.save(recipeIngredients.recipeId, recipeIngredients.rows);
        }
    }

    // Update RecipeSteps rows
    const recipesSteps = recipes.map(recipeItem => ({
        recipeId: recipeItem.recipeId,
        rows: recipeMethodRequestToRows(recipeItem),
    }));
    for (const recipeSteps of recipesSteps) {
        if (recipeSteps.rows) await RecipeStepActions.save(recipeSteps.recipeId, recipeSteps.rows);
    }

    // Update RecipeTags rows
    const recipesTags = recipes.map(({ recipeId, tags }) => ({
        recipeId,
        rows: recipeTagsRequestToRows(recipeId, tags),
    }));
    for (const recipeTags of recipesTags) {
        if (recipeTags.rows) await RecipeTagActions.save(recipeTags.recipeId, recipeTags.rows);
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
    readAll,
    readMy,
    save,
    delete: deleteRecipe,
    readByBook,
};

export type RecipeActions = typeof RecipeActions;

export const InternalRecipeActions = {
    read: readInternal,
    readByPhoto,
};
