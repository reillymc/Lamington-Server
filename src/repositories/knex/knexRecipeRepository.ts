import { EnsureArray, Undefined } from "@reillymc/es-utils";
import type { Ingredient } from "../ingredientRepository.ts";
import type {
    ReadTagsResponse,
    Recipe,
    RecipeIngredient,
    RecipeRating,
    RecipeRecipe,
    RecipeRepository,
} from "../recipeRepository.ts";
import type { Content, ContentTag } from "../temp.ts";
import { buildUpdateRecord } from "./common/dataFormatting/buildUpdateRecord.ts";
import { formatHeroAttachment } from "./common/dataFormatting/formatHeroAttachment.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import { withContentAuthor } from "./common/queryBuilders/withContentAuthor.ts";
import { withHeroAttachment } from "./common/queryBuilders/withHeroAttachment.ts";
import { withPagination } from "./common/queryBuilders/withPagination.ts";
import { createDeleteContent } from "./common/repositoryMethods/content.ts";
import { HeroAttachmentActions } from "./common/repositoryMethods/contentAttachment.ts";
import { verifyContentPermissions } from "./common/repositoryMethods/contentPermissions.ts";
import { ContentTagActions } from "./common/repositoryMethods/contentTag.ts";
import type {
    ContentAuthorColumns,
    HeroAttachmentColumns,
} from "./common/rowTypes.ts";
import type { KnexDatabase } from "./knex.ts";
import {
    BookRecipeTable,
    ContentTable,
    ContentTagTable,
    IngredientTable,
    lamington,
    RecipeIngredientTable,
    RecipeRatingTable,
    RecipeRecipeTable,
    RecipeTable,
} from "./spec/index.ts";

const PAGE_SIZE = 50;

const ContentTagsRequestToRows = (
    contentId: string,
    tags: ReadonlyArray<{ tagId: string }>,
): ContentTag[] => tags.map(({ tagId }) => ({ contentId, tagId }));

const readTags = (
    db: KnexDatabase,
    request: {
        recipeId: Recipe["recipeId"];
    },
): Promise<Array<RecipeTagRow>> =>
    ContentTagActions.readByContentId(
        db,
        EnsureArray(request).map(({ recipeId }) => recipeId),
    ).then((response) =>
        response.map(({ contentId, parentId, name, ...rest }) => ({
            recipeId: contentId,
            parentId: toUndefined(parentId),
            name: toUndefined(name),
            ...rest,
        })),
    );

const saveTags = (
    db: KnexDatabase,
    request: {
        recipeId: Recipe["recipeId"];
        tags: ReadonlyArray<Pick<ContentTag, "tagId">>;
    },
) =>
    ContentTagActions.save(
        db,
        EnsureArray(request).map(({ recipeId, tags }) => ({
            contentId: recipeId,
            tags,
        })),
    );

/**
 * Get all ingredients for a recipe
 * @param recipeId recipe to retrieve ingredients from
 * @returns RecipeIngredient
 */
const queryRecipeIngredientsByRecipeId = async (
    db: KnexDatabase,
    { recipeId }: Pick<Recipe, "recipeId">,
) => {
    const data: Array<
        Pick<Ingredient, "ingredientId" | "name" | "namePlural">
    > = await db(lamington.recipeIngredient)
        .where({ [RecipeIngredientTable.recipeId]: recipeId })
        .select(
            IngredientTable.ingredientId,
            IngredientTable.name,
            IngredientTable.namePlural,
        )
        .leftJoin(
            lamington.ingredient,
            RecipeIngredientTable.ingredientId,
            IngredientTable.ingredientId,
        );

    return { result: data };
};

/**
 * Get all sub-recipes for a recipe
 * @param recipeId recipe to retrieve sub-recipes from
 * @returns RecipeIngredient
 */
const queryRecipeSubRecipesByRecipeId = async (
    db: KnexDatabase,
    { recipeId }: Pick<Recipe, "recipeId">,
) => {
    const data: Array<Pick<Recipe, "recipeId" | "name">> = await db(
        lamington.recipeRecipe,
    )
        .where({ [RecipeRecipeTable.recipeId]: recipeId })
        .select(RecipeTable.recipeId, RecipeTable.name)
        .leftJoin(
            lamington.recipe,
            RecipeRecipeTable.subRecipeId,
            RecipeTable.recipeId,
        );

    return { result: data };
};

/**
 * Update RecipeIngredients for recipeId, by deleting all ingredients not in ingredient list and then creating / updating provided ingredients in list
 * @param recipeId recipe to modify
 * @param recipeIngredients ingredients to include in recipe
 */
const saveRecipeIngredientRows = async (
    db: KnexDatabase,
    params: Pick<Recipe, "recipeId"> & {
        ingredients: Array<RecipeIngredient["ingredientId"]>;
    },
) => {
    const recipeIngredients = EnsureArray(params);

    const deleteExcessRows = async (recipeId: string) =>
        db<RecipeIngredient>(lamington.recipeIngredient)
            .where({ recipeId })
            .delete();

    const insertRows = async (recipeIngredients: RecipeIngredient[]) =>
        db<RecipeIngredient>(lamington.recipeIngredient).insert(
            recipeIngredients,
        );

    for (const { recipeId } of recipeIngredients) {
        // TODO: flatten loop
        await deleteExcessRows(recipeId);
    }

    const ingredients = recipeIngredients.flatMap(({ recipeId, ingredients }) =>
        ingredients.map(
            (ingredientId): RecipeIngredient => ({ ingredientId, recipeId }),
        ),
    );

    if (ingredients.length > 0) await insertRows(ingredients);

    return [];
};

const saveRecipeRecipeRows = async (
    db: KnexDatabase,
    params: Pick<Recipe, "recipeId"> & {
        recipes: Array<RecipeRecipe["recipeId"]>;
    },
) => {
    const recipeRecipes = EnsureArray(params);

    const deleteExcessRows = async (recipeId: string) =>
        db<RecipeRecipe>(lamington.recipeRecipe).where({ recipeId }).delete();

    const insertRows = async (recipeRecipes: RecipeRecipe[]) =>
        db<RecipeRecipe>(lamington.recipeRecipe).insert(recipeRecipes);

    for (const { recipeId } of recipeRecipes) {
        // TODO: flatten loop
        await deleteExcessRows(recipeId);
    }

    const recipes = recipeRecipes.flatMap(({ recipeId, recipes }) =>
        recipes.map((subRecipeId): RecipeRecipe => ({ recipeId, subRecipeId })),
    );

    if (recipes.length > 0) await insertRows(recipes);

    return [];
};

const ratingPersonalName = "rating_personal";
const ratingAverageName = "rating_average";

type RecipeRatingColumns = {
    [ratingAverageName]: string | null;
    [ratingPersonalName]: RecipeRating["rating"] | null;
};

type FullRecipeRow = Pick<
    Recipe,
    | "recipeId"
    | "name"
    | "source"
    | "servings"
    | "prepTime"
    | "cookTime"
    | "tips"
    | "summary"
    | "public"
    | "method"
    | "ingredients"
    | "timesCooked"
    | "nutritionalInformation"
> & {
    createdAt: Content["createdAt"];
    updatedAt: Content["updatedAt"];
} & ContentAuthorColumns &
    HeroAttachmentColumns &
    RecipeRatingColumns;

type RecipeListItemRow = Pick<
    Recipe,
    "recipeId" | "name" | "timesCooked" | "cookTime" | "prepTime" | "public"
> &
    ContentAuthorColumns &
    HeroAttachmentColumns &
    RecipeRatingColumns;

type RecipeTagRow = {
    recipeId: string;
    tagId: string;
    parentId: string | undefined;
    name: string;
};

const RecipeBase = (db: KnexDatabase, userId: string) => {
    const ratingsSubquery = db(lamington.recipeRating)
        .select(RecipeRatingTable.recipeId)
        .avg({ rating_average: RecipeRatingTable.rating })
        .groupBy(RecipeRatingTable.recipeId)
        .as("avg_ratings");

    return db(lamington.recipe)
        .select(
            RecipeTable.recipeId,
            RecipeTable.name,
            RecipeTable.timesCooked,
            RecipeTable.cookTime,
            RecipeTable.prepTime,
            RecipeTable.public,
            db.ref("avg_ratings.rating_average"),
            db(lamington.recipeRating)
                .select(RecipeRatingTable.rating)
                .whereRaw('"recipe_rating"."recipeId" = "recipe"."recipeId"')
                .andWhere(RecipeRatingTable.raterId, userId)
                .first()
                .as("rating_personal"),
        )
        .leftJoin(
            lamington.content,
            RecipeTable.recipeId,
            ContentTable.contentId,
        )
        .leftJoin(ratingsSubquery, RecipeTable.recipeId, "avg_ratings.recipeId")
        .modify(withContentAuthor)
        .modify(withHeroAttachment(RecipeTable.recipeId));
};

const getFullRecipe = async (
    db: KnexDatabase,
    recipeId: string,
    userId: string,
): Promise<FullRecipeRow | undefined> => {
    const ratingsSubquery = db(lamington.recipeRating)
        .select(RecipeRatingTable.recipeId)
        .avg({ rating_average: RecipeRatingTable.rating })
        .groupBy(RecipeRatingTable.recipeId)
        .as("avg_ratings");

    const query = db(lamington.recipe)
        .select(
            RecipeTable.recipeId,
            "name",
            "source",
            "servings",
            "prepTime",
            "cookTime",
            "tips",
            "summary",
            "public",
            "method",
            "ingredients",
            "timesCooked",
            "nutritionalInformation",
            ContentTable.createdAt,
            ContentTable.updatedAt,
            db.ref("avg_ratings.rating_average"),
            db(lamington.recipeRating)
                .select(RecipeRatingTable.rating)
                .whereRaw('"recipe_rating"."recipeId" = "recipe"."recipeId"')
                .andWhere(RecipeRatingTable.raterId, userId)
                .first()
                .as("rating_personal"),
        )
        .leftJoin(
            lamington.content,
            RecipeTable.recipeId,
            ContentTable.contentId,
        )
        .leftJoin(ratingsSubquery, RecipeTable.recipeId, "avg_ratings.recipeId")
        .modify(withContentAuthor)
        .modify(withHeroAttachment(RecipeTable.recipeId))
        .where(RecipeTable.recipeId, recipeId)
        .first();

    return query;
};

const formatRecipe = (recipe: FullRecipeRow) => ({
    recipeId: recipe.recipeId,
    name: recipe.name,
    cookTime: toUndefined(recipe.cookTime),
    prepTime: toUndefined(recipe.prepTime),
    servings: toUndefined(recipe.servings),
    source: toUndefined(recipe.source),
    summary: toUndefined(recipe.summary),
    tips: toUndefined(recipe.tips),
    timesCooked: toUndefined(recipe.timesCooked),
    public: toUndefined(recipe.public),
    method: toUndefined(recipe.method),
    ingredients: toUndefined(recipe.ingredients),
    nutritionalInformation: toUndefined(recipe.nutritionalInformation),
    owner: {
        userId: recipe.createdBy,
        firstName: recipe.firstName,
    },
});

const read: RecipeRepository<KnexDatabase>["read"] = async (
    db,
    { userId, recipes },
) => {
    const response: Awaited<
        ReturnType<RecipeRepository["read"]>
    >["recipes"][number][] = [];

    // TODO: remove loop and use requests keyed by recipe id for sub-queries
    for (const { recipeId } of recipes) {
        // Fetch from database
        const [recipe, tags, { result: ingredients }, { result: subRecipes }] =
            await Promise.all([
                getFullRecipe(db, recipeId, userId),
                readTags(db, { recipeId }),
                queryRecipeIngredientsByRecipeId(db, { recipeId }),
                queryRecipeSubRecipesByRecipeId(db, { recipeId }),
            ]);

        const ingredientMap = Object.fromEntries(
            ingredients.map((ingredient) => [
                ingredient.ingredientId,
                {
                    ingredientId: ingredient.ingredientId,
                    name: ingredient.name,
                    namePlural: toUndefined(ingredient.namePlural),
                },
            ]),
        );

        const recipeMap = Object.fromEntries(
            subRecipes.map((subRecipe) => [
                subRecipe.recipeId,
                {
                    recipeId: subRecipe.recipeId,
                    name: subRecipe.name,
                },
            ]),
        );

        if (!recipe) continue;

        response.push({
            ...formatRecipe(recipe),
            rating: {
                average: recipe[ratingAverageName]
                    ? parseFloat(recipe[ratingAverageName])
                    : undefined,
                personal: toUndefined(recipe[ratingPersonalName]),
            },
            ingredients: recipe.ingredients?.map((section) => ({
                ...section,
                items: section.items.map((item) => {
                    if ("ingredient" in item) {
                        const { ingredientId, name } = item.ingredient;
                        const ingredient = ingredientMap[ingredientId];
                        return {
                            ...item,
                            ingredient: {
                                ingredientId,
                                name,
                                ...ingredient,
                            },
                        };
                    }

                    if ("recipe" in item) {
                        return {
                            ...item,
                            recipe: {
                                ...item.recipe,
                                ...recipeMap[item.recipe.recipeId],
                            },
                        };
                    }

                    return item;
                }),
            })),
            tags: tags?.length ? ContentTagRowsToResponse(tags) : undefined,
            photo: formatHeroAttachment(
                recipe.heroAttachmentId,
                recipe.heroAttachmentUri,
            ),
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
            recipesToCreate.map((recipe) => ({
                name: recipe.name,
                public: recipe.public,
                recipeId: recipe.recipeId,
                cookTime: recipe.cookTime,
                nutritionalInformation: recipe.nutritionalInformation,
                // https://github.com/knex/knex/issues/6126
                ingredients: !recipe.ingredients
                    ? recipe.ingredients
                    : (JSON.stringify(
                          recipe.ingredients,
                      ) as unknown as Recipe["ingredients"]),
                method: !recipe.method
                    ? recipe.method
                    : (JSON.stringify(
                          recipe.method,
                      ) as unknown as Recipe["method"]),
                prepTime: recipe.prepTime,
                servings: recipe.servings,
                source: recipe.source,
                summary: recipe.summary,
                timesCooked: recipe.timesCooked,
                tips: recipe.tips,
            })),
        );

        const recipesIngredients = recipesToCreate.map((recipeItem) => ({
            recipeId: recipeItem.recipeId,
            rows: recipeItem.ingredients?.flatMap(({ items }) =>
                items
                    .map((item) =>
                        "ingredient" in item
                            ? item.ingredient?.ingredientId
                            : undefined,
                    )
                    .filter(Undefined),
            ),
        }));

        const recipesRecipes = recipesToCreate.map((recipeItem) => ({
            recipeId: recipeItem.recipeId,
            rows: recipeItem.ingredients?.flatMap(({ items }) =>
                items
                    .map((item) =>
                        "recipe" in item ? item.recipe?.recipeId : undefined,
                    )
                    .filter(Undefined),
            ),
        }));

        for (const { recipeId, rows } of recipesIngredients) {
            if (rows?.length)
                await saveRecipeIngredientRows(db, {
                    recipeId,
                    ingredients: rows,
                });
        }

        for (const { recipeId, rows } of recipesRecipes) {
            if (rows?.length)
                await saveRecipeRecipeRows(db, {
                    recipeId,
                    recipes: rows,
                });
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
                rating ? { raterId: userId, rating, recipeId } : undefined,
            )
            .filter(Undefined);
        if (recipeRatingRows.length) {
            await db<RecipeRating>(lamington.recipeRating)
                .insert(recipeRatingRows)
                .onConflict(["recipeId", "raterId"])
                .merge();
        }

        await HeroAttachmentActions.save(
            db,
            recipesToCreate.map(({ recipeId, photo }) => ({
                contentId: recipeId,
                attachmentId: photo?.attachmentId,
            })),
        );

        const results = await read(db, { userId, recipes: recipesToCreate });

        return { userId, recipes: results.recipes };
    },
    update: async (db, { userId, recipes }) => {
        for (const recipe of recipes) {
            const updateData = buildUpdateRecord(
                {
                    ...recipe,
                    nutritionalInformation: recipe.nutritionalInformation,
                    // https://github.com/knex/knex/issues/6126
                    ingredients: !recipe.ingredients
                        ? recipe.ingredients
                        : (JSON.stringify(
                              recipe.ingredients,
                          ) as unknown as Recipe["ingredients"]),
                    method: !recipe.method
                        ? recipe.method
                        : (JSON.stringify(
                              recipe.method,
                          ) as unknown as Recipe["method"]),
                },
                RecipeTable,
            );

            if (updateData) {
                await db(lamington.recipe)
                    .where(RecipeTable.recipeId, recipe.recipeId)
                    .update(updateData);
            }
        }

        const recipesIngredients = recipes.map((recipeItem) => ({
            recipeId: recipeItem.recipeId,
            rows: recipeItem.ingredients?.flatMap(({ items }) =>
                items
                    .map((item) =>
                        "ingredient" in item
                            ? item.ingredient?.ingredientId
                            : undefined,
                    )
                    .filter(Undefined),
            ),
        }));

        const recipesRecipes = recipes.map((recipeItem) => ({
            recipeId: recipeItem.recipeId,
            rows: recipeItem.ingredients?.flatMap(({ items }) =>
                items
                    .map((item) =>
                        "recipe" in item ? item.recipe?.recipeId : undefined,
                    )
                    .filter(Undefined),
            ),
        }));

        for (const { recipeId, rows } of recipesIngredients) {
            if (rows)
                await saveRecipeIngredientRows(db, {
                    recipeId,
                    ingredients: rows,
                });
        }

        for (const { recipeId, rows } of recipesRecipes) {
            if (rows)
                await saveRecipeRecipeRows(db, {
                    recipeId,
                    recipes: rows,
                });
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
                rating ? { raterId: userId, rating, recipeId } : undefined,
            )
            .filter(Undefined);

        const recipeRatingDeleteRows = recipes.filter(
            ({ rating }) => rating === null,
        );

        if (recipeRatingDeleteRows.length) {
            await db<RecipeRating>(lamington.recipeRating)
                .whereIn(
                    RecipeRatingTable.recipeId,
                    recipeRatingDeleteRows.map(({ recipeId }) => recipeId),
                )
                .andWhere(RecipeRatingTable.raterId, userId)
                .delete();
        }

        if (recipeRatingRows.length) {
            await db<RecipeRating>(lamington.recipeRating)
                .insert(recipeRatingRows)
                .onConflict(["recipeId", "raterId"])
                .merge();
        }

        await HeroAttachmentActions.save(
            db,
            recipes.map(({ recipeId, photo }) => ({
                contentId: recipeId,
                attachmentId: photo === null ? null : photo?.attachmentId,
            })),
        );

        return read(db, { userId, recipes });
    },
    verifyPermissions: async (db, { userId, recipes, status }) => {
        const recipeIds = EnsureArray(recipes).map((r) => r.recipeId);
        const permissions = await verifyContentPermissions(
            db,
            userId,
            recipeIds,
            status,
        );
        return {
            userId,
            status,
            recipes: recipeIds.map((recipeId) => ({
                recipeId,
                hasPermissions: permissions[recipeId] ?? false,
            })),
        };
    },
    readAll: async (
        db,
        { userId, order, page = 1, sort = "name", filter = {} },
    ) => {
        const sortColumn = {
            name: RecipeTable.name,
            ratingPersonal: ratingPersonalName,
            ratingAverage: ratingAverageName,
            cookTime: RecipeTable.cookTime,
        }[sort];

        const recipeList: RecipeListItemRow[] = await RecipeBase(db, userId)
            .where((builder) => {
                if (!filter.name) return;
                return builder.where(
                    RecipeTable.name,
                    "ILIKE",
                    `%${filter.name}%`,
                );
            })
            .where((builder) => {
                builder
                    .where({ [ContentTable.createdBy]: userId })
                    .orWhere({ [RecipeTable.public]: true });

                if (!filter.owner) return builder;

                return builder.andWhere({
                    [ContentTable.createdBy]: filter.owner,
                });
            })
            .where((builder) => {
                if (!filter.tags?.length) return;
                return builder.whereIn(
                    RecipeTable.recipeId,
                    db
                        .select(ContentTagTable.contentId)
                        .from(lamington.contentTag)
                        .whereIn(
                            ContentTagTable.tagId,
                            filter.tags.map(({ tagId }) => tagId),
                        ),
                );
            })
            .where((builder) => {
                if (!filter.ingredients?.length) return;
                return builder.whereIn(
                    RecipeTable.recipeId,
                    db
                        .select(RecipeIngredientTable.recipeId)
                        .from(lamington.recipeIngredient)
                        .whereIn(
                            RecipeIngredientTable.ingredientId,
                            filter.ingredients.map(
                                ({ ingredientId }) => ingredientId,
                            ),
                        ),
                );
            })
            .modify((builder) => {
                if (!filter.books?.length) return;
                builder
                    .leftJoin(
                        lamington.bookRecipe,
                        RecipeTable.recipeId,
                        BookRecipeTable.recipeId,
                    )
                    .whereIn(
                        BookRecipeTable.bookId,
                        filter.books.map(({ bookId }) => bookId),
                    );
            })

            .orderBy([{ column: sortColumn, order }, RecipeTable.recipeId])
            .modify(withPagination({ page, pageSize: PAGE_SIZE }));

        let nextPage: number | undefined;
        if (recipeList.length > PAGE_SIZE) {
            nextPage = page + 1;
            recipeList.pop();
        }

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
                    recipeId: recipe.recipeId,
                    name: recipe.name,
                    owner: {
                        userId: recipe.createdBy,
                        firstName: recipe.firstName,
                    },
                    rating: {
                        average: ratingAverage
                            ? parseFloat(ratingAverage)
                            : undefined,
                        personal: toUndefined(ratingPersonal),
                    },
                    photo: formatHeroAttachment(
                        heroAttachmentId,
                        heroAttachmentUri,
                    ),
                }),
            ),
        };
    },
    read,
    delete: createDeleteContent("recipes", "recipeId"),
    saveRating: async (db, { userId, ratings }) => {
        const savedRatings = await db<RecipeRating>(lamington.recipeRating)
            .insert(
                ratings.map(({ rating, recipeId }) => ({
                    rating,
                    recipeId,
                    raterId: userId,
                })),
            )
            .onConflict(["recipeId", "raterId"])
            .merge()
            .returning(["recipeId", "rating"]);

        return {
            userId,
            ratings: savedRatings,
        };
    },
};

const ContentTagRowsToResponse = (
    tags: ReadonlyArray<RecipeTagRow>,
): ReadTagsResponse =>
    tags.reduce<
        Record<
            string,
            {
                tagId: string;
                name: string | undefined;
                tags: Array<{ tagId: string; name: string }> | undefined;
            }
        >
    >((acc, { tagId, parentId, name }) => {
        if (parentId) {
            acc[parentId] = {
                ...acc[parentId],
                tagId: parentId,
                name: acc[parentId]?.name,
                tags: [...(acc[parentId]?.tags ?? []), { tagId, name }],
            };
        } else {
            acc[tagId] = {
                ...acc[tagId],
                tagId,
                name,
                tags: acc[tagId]?.tags,
            };
        }
        return acc;
    }, {});
