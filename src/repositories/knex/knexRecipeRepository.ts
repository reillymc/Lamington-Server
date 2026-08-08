import { EnsureArray, Undefined } from "@reillymc/es-utils";
import type { Ingredient } from "../ingredientRepository.ts";
import type {
    ReadTagsResponse,
    Recipe,
    RecipeIngredient,
    RecipeIngredientItemRequest,
    RecipeMethodStepResponse,
    RecipePayload,
    RecipeRating,
    RecipeRecipe,
    RecipeRepository,
    RecipeSection,
} from "../recipeRepository.ts";
import type { Content } from "../temp.ts";
import { buildUpdateRecord } from "./common/dataFormatting/buildUpdateRecord.ts";
import { formatHeroAttachment } from "./common/dataFormatting/formatHeroAttachment.ts";
import { serializeJsonField } from "./common/dataFormatting/serializeJsonField.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import { withContentAuthor } from "./common/queryBuilders/withContentAuthor.ts";
import { withHeroAttachment } from "./common/queryBuilders/withHeroAttachment.ts";
import { withPagination } from "./common/queryBuilders/withPagination.ts";
import {
    createContentRows,
    createDeleteContent,
} from "./common/repositoryMethods/content.ts";
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

const groupBy = <T, K>(rows: ReadonlyArray<T>, key: (row: T) => K) => {
    const groups = new Map<K, T[]>();
    for (const row of rows) {
        const k = key(row);
        groups.set(k, [...(groups.get(k) ?? []), row]);
    }
    return groups;
};

const groupRecipeTags = (tags: ReadonlyArray<RecipeTagRow>) => {
    const groups = new Map<string, RecipeTagRow[]>();
    const parents = new Map<string, RecipeTagRow>();

    for (const tag of tags) {
        if (!tag.recipeId) {
            parents.set(tag.tagId, tag);
        } else {
            groups.set(tag.recipeId, [
                ...(groups.get(tag.recipeId) ?? []),
                tag,
            ]);
        }
    }

    for (const rows of groups.values()) {
        const parentIds = new Set(
            rows.flatMap(({ parentId }) => (parentId ? [parentId] : [])),
        );
        for (const parentId of parentIds) {
            const parent = parents.get(parentId);
            if (parent) rows.push(parent);
        }
    }

    return groups;
};

const readTags = (
    db: KnexDatabase,
    recipeIds: ReadonlyArray<Recipe["recipeId"]>,
): Promise<Array<RecipeTagRow>> =>
    ContentTagActions.readByContentId(db, recipeIds).then((response) =>
        response.map(({ contentId, parentId, name, ...rest }) => ({
            recipeId: contentId,
            parentId: toUndefined(parentId),
            name: toUndefined(name),
            ...rest,
        })),
    );

const saveTags = (
    db: KnexDatabase,
    items: ReadonlyArray<{
        recipeId: Recipe["recipeId"];
        tags: ReadonlyArray<{ tagId: string }>;
    }>,
) =>
    ContentTagActions.save(
        db,
        items.map(({ recipeId, tags }) => ({
            contentId: recipeId,
            tags,
        })),
    );

type RecipeIngredientRow = Pick<
    Ingredient,
    "ingredientId" | "name" | "namePlural"
> & {
    recipeId: string;
};

const queryRecipeIngredients = (
    db: KnexDatabase,
    recipeIds: ReadonlyArray<Recipe["recipeId"]>,
): Promise<Array<RecipeIngredientRow>> =>
    db(lamington.recipeIngredient)
        .select(
            RecipeIngredientTable.recipeId,
            IngredientTable.ingredientId,
            IngredientTable.name,
            IngredientTable.namePlural,
        )
        .whereIn(RecipeIngredientTable.recipeId, recipeIds)
        .leftJoin(
            lamington.ingredient,
            RecipeIngredientTable.ingredientId,
            IngredientTable.ingredientId,
        );

type RecipeSubRecipeRow = {
    parentRecipeId: string;
    recipeId: string;
    name: string;
};

const queryRecipeSubRecipes = (
    db: KnexDatabase,
    recipeIds: ReadonlyArray<Recipe["recipeId"]>,
): Promise<Array<RecipeSubRecipeRow>> =>
    db(lamington.recipeRecipe)
        .select({
            parentRecipeId: RecipeRecipeTable.recipeId,
            recipeId: RecipeTable.recipeId,
            name: RecipeTable.name,
        })
        .whereIn(RecipeRecipeTable.recipeId, recipeIds)
        .leftJoin(
            lamington.recipe,
            RecipeRecipeTable.subRecipeId,
            RecipeTable.recipeId,
        );

/**
 * Update RecipeIngredients for recipeId, by deleting all ingredients not in ingredient list and then creating / updating provided ingredients in list
 * @param recipeId recipe to modify
 * @param recipeIngredients ingredients to include in recipe
 */
const saveRecipeIngredientRows = async (
    db: KnexDatabase,
    params: ReadonlyArray<
        Pick<Recipe, "recipeId"> & {
            ingredients: Array<RecipeIngredient["ingredientId"]>;
        }
    >,
) => {
    const recipeIngredients = EnsureArray(params);

    const recipeIds = recipeIngredients.map(({ recipeId }) => recipeId);
    if (recipeIds.length === 0) return;

    await db<RecipeIngredient>(lamington.recipeIngredient)
        .whereIn(RecipeIngredientTable.recipeId, recipeIds)
        .delete();

    const ingredients = recipeIngredients.flatMap(({ recipeId, ingredients }) =>
        ingredients.map(
            (ingredientId): RecipeIngredient => ({ ingredientId, recipeId }),
        ),
    );

    if (ingredients.length > 0) {
        await db<RecipeIngredient>(lamington.recipeIngredient).insert(
            ingredients,
        );
    }
};

const saveRecipeRecipeRows = async (
    db: KnexDatabase,
    params: ReadonlyArray<
        Pick<Recipe, "recipeId"> & {
            recipes: Array<RecipeRecipe["recipeId"]>;
        }
    >,
) => {
    const recipeRecipes = EnsureArray(params);

    const recipeIds = recipeRecipes.map(({ recipeId }) => recipeId);
    if (recipeIds.length === 0) return;

    await db<RecipeRecipe>(lamington.recipeRecipe)
        .whereIn(RecipeRecipeTable.recipeId, recipeIds)
        .delete();

    const recipes = recipeRecipes.flatMap(({ recipeId, recipes }) =>
        recipes.map((subRecipeId): RecipeRecipe => ({ recipeId, subRecipeId })),
    );

    if (recipes.length > 0) {
        await db<RecipeRecipe>(lamington.recipeRecipe).insert(recipes);
    }
};

const ratingPersonalName = "rating_personal";
const ratingAverageName = "rating_average";

type RecipeRatingColumns = {
    [ratingAverageName]: string | null;
    [ratingPersonalName]: RecipeRating["rating"] | null;
};

// The recipe table stores DB-nullable columns as `| null`, unlike the
// response-facing `Recipe` which exposes them as `| undefined`. The JSONB
// ingredients hold the client-sent request items; names are enriched on read.
type RecipeRow = {
    recipeId: Recipe["recipeId"];
    name: Recipe["name"];
    source: Recipe["source"] | null;
    servings: Recipe["servings"] | null;
    prepTime: Recipe["prepTime"] | null;
    cookTime: Recipe["cookTime"] | null;
    nutritionalInformation: Recipe["nutritionalInformation"] | null;
    summary: Recipe["summary"] | null;
    tips: Recipe["tips"] | null;
    public: Recipe["public"] | null;
    timesCooked: Recipe["timesCooked"] | null;
    ingredients: ReadonlyArray<
        RecipeSection<RecipeIngredientItemRequest>
    > | null;
    method: ReadonlyArray<RecipeSection<RecipeMethodStepResponse>> | null;
};

type FullRecipeRow = Pick<
    RecipeRow,
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

const buildRecipeQuery = (db: KnexDatabase) => {
    const ratingsSubquery = db(lamington.recipeRating)
        .select(RecipeRatingTable.recipeId)
        .avg({ rating_average: RecipeRatingTable.rating })
        .groupBy(RecipeRatingTable.recipeId)
        .as("avg_ratings");

    return db(lamington.recipe)
        .leftJoin(
            lamington.content,
            RecipeTable.recipeId,
            ContentTable.contentId,
        )
        .leftJoin(ratingsSubquery, RecipeTable.recipeId, "avg_ratings.recipeId")
        .modify(withContentAuthor)
        .modify(withHeroAttachment(RecipeTable.recipeId));
};

const withPersonalRating = (db: KnexDatabase, userId: string) =>
    db(lamington.recipeRating)
        .select(RecipeRatingTable.rating)
        .whereRaw('"recipe_rating"."recipeId" = "recipe"."recipeId"')
        .andWhere(RecipeRatingTable.raterId, userId)
        .first()
        .as(ratingPersonalName);

const queryFullRecipes = (
    db: KnexDatabase,
    recipeIds: ReadonlyArray<Recipe["recipeId"]>,
    userId: string,
): Promise<FullRecipeRow[]> =>
    buildRecipeQuery(db)
        .select(
            RecipeTable.recipeId,
            RecipeTable.name,
            RecipeTable.source,
            RecipeTable.servings,
            RecipeTable.prepTime,
            RecipeTable.cookTime,
            RecipeTable.tips,
            RecipeTable.summary,
            RecipeTable.public,
            RecipeTable.method,
            RecipeTable.ingredients,
            RecipeTable.timesCooked,
            RecipeTable.nutritionalInformation,
            ContentTable.createdAt,
            ContentTable.updatedAt,
            db.ref(`avg_ratings.${ratingAverageName}`),
            withPersonalRating(db, userId),
        )
        .whereIn(RecipeTable.recipeId, recipeIds);

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

const formatRating = (
    average: RecipeRatingColumns[typeof ratingAverageName],
    personal: RecipeRatingColumns[typeof ratingPersonalName],
) => ({
    average: average ? parseFloat(average) : undefined,
    personal: toUndefined(personal),
});

const toMethodSections = (
    sections: RecipePayload["method"],
): RecipeRow["method"] | undefined => {
    if (sections === null || sections === undefined) {
        return sections;
    }
    return sections.map(({ name, description, items }) => ({
        name,
        description,
        items: items
            .map(({ content }) => content)
            .filter(Undefined)
            .map((content) => ({ content })),
    }));
};

const extractIngredientIds = (sections: RecipeRow["ingredients"] | undefined) =>
    sections?.flatMap(({ items }) =>
        items
            .map((item) =>
                "ingredient" in item
                    ? item.ingredient?.ingredientId
                    : undefined,
            )
            .filter(Undefined),
    );

const extractSubRecipeIds = (sections: RecipeRow["ingredients"] | undefined) =>
    sections?.flatMap(({ items }) =>
        items
            .map((item) =>
                "recipe" in item ? item.recipe?.recipeId : undefined,
            )
            .filter(Undefined),
    );

const read: RecipeRepository<KnexDatabase>["read"] = async (
    db,
    { userId, recipes },
) => {
    const recipeIds = recipes.map(({ recipeId }) => recipeId);

    if (recipeIds.length === 0) {
        return { userId, recipes: [] };
    }

    const [recipeRows, tags, ingredients, subRecipes] = await Promise.all([
        queryFullRecipes(db, recipeIds, userId),
        readTags(db, recipeIds),
        queryRecipeIngredients(db, recipeIds),
        queryRecipeSubRecipes(db, recipeIds),
    ]);

    const recipesById = new Map(
        recipeRows.map((recipe) => [recipe.recipeId, recipe]),
    );
    const tagsByRecipeId = groupRecipeTags(tags);
    const ingredientsByRecipeId = groupBy(
        ingredients,
        ({ recipeId }) => recipeId,
    );
    const subRecipesByRecipeId = groupBy(
        subRecipes,
        ({ parentRecipeId }) => parentRecipeId,
    );

    return {
        userId,
        recipes: recipes.flatMap(({ recipeId }) => {
            const recipe = recipesById.get(recipeId);
            if (!recipe) return [];

            const ingredientMap: Record<
                string,
                | {
                      ingredientId: string;
                      name: string;
                      namePlural: string | undefined;
                  }
                | undefined
            > = Object.fromEntries(
                (ingredientsByRecipeId.get(recipeId) ?? []).map(
                    (ingredient) => [
                        ingredient.ingredientId,
                        {
                            ingredientId: ingredient.ingredientId,
                            name: ingredient.name,
                            namePlural: toUndefined(ingredient.namePlural),
                        },
                    ],
                ),
            );

            const recipeMap: Record<
                string,
                { recipeId: string; name: string } | undefined
            > = Object.fromEntries(
                (subRecipesByRecipeId.get(recipeId) ?? []).map((subRecipe) => [
                    subRecipe.recipeId,
                    {
                        recipeId: subRecipe.recipeId,
                        name: subRecipe.name,
                    },
                ]),
            );

            const recipeTags = tagsByRecipeId.get(recipeId);

            return [
                {
                    ...formatRecipe(recipe),
                    rating: formatRating(
                        recipe[ratingAverageName],
                        recipe[ratingPersonalName],
                    ),
                    ingredients: recipe.ingredients?.map((section) => ({
                        ...section,
                        items: section.items.map((item) => {
                            const base = {
                                amount: item.amount,
                                description: item.description,
                                unit: item.unit,
                                multiplier: item.multiplier,
                                name: item.name,
                                preparation: item.preparation,
                            };

                            if (item.ingredient) {
                                const { ingredientId } = item.ingredient;
                                const ingredient = ingredientMap[ingredientId];
                                return {
                                    ...base,
                                    ingredient: {
                                        ingredientId,
                                        name:
                                            ingredient?.name ?? item.name ?? "",
                                        namePlural: ingredient?.namePlural,
                                    },
                                    recipe: undefined,
                                };
                            }

                            if (item.recipe) {
                                const { recipeId } = item.recipe;
                                const subRecipe = recipeMap[recipeId];
                                return {
                                    ...base,
                                    ingredient: undefined,
                                    recipe: {
                                        recipeId,
                                        name:
                                            subRecipe?.name ?? item.name ?? "",
                                    },
                                };
                            }

                            return {
                                ...base,
                                ingredient: undefined,
                                recipe: undefined,
                            };
                        }),
                    })),
                    tags: ContentTagRowsToResponse(recipeTags),
                    photo: formatHeroAttachment(
                        recipe.heroAttachmentId,
                        recipe.heroAttachmentUri,
                    ),
                },
            ];
        }),
    };
};

export const KnexRecipeRepository: RecipeRepository<KnexDatabase> = {
    create: async (db, { userId, recipes }) => {
        const newContent = await createContentRows(db, userId, recipes.length);

        const recipesToCreate = newContent.map(({ contentId }, index) => ({
            ...recipes[index],
            recipeId: contentId,
        }));

        await db<RecipeRow>(lamington.recipe).insert(
            recipesToCreate.map((recipe) => ({
                name: recipe.name,
                public: recipe.public,
                recipeId: recipe.recipeId,
                cookTime: recipe.cookTime,
                nutritionalInformation: recipe.nutritionalInformation,
                ingredients: serializeJsonField(recipe.ingredients),
                method: serializeJsonField(toMethodSections(recipe.method)),
                prepTime: recipe.prepTime,
                servings: recipe.servings,
                source: recipe.source,
                summary: recipe.summary,
                timesCooked: recipe.timesCooked,
                tips: recipe.tips,
            })),
        );

        const recipesIngredients = recipesToCreate.flatMap(
            ({ recipeId, ingredients }) => {
                const rows = extractIngredientIds(ingredients) ?? [];
                return rows.length > 0 ? [{ recipeId, ingredients: rows }] : [];
            },
        );

        const recipesRecipes = recipesToCreate.flatMap(
            ({ recipeId, ingredients }) => {
                const rows = extractSubRecipeIds(ingredients) ?? [];
                return rows.length > 0 ? [{ recipeId, recipes: rows }] : [];
            },
        );

        await saveRecipeIngredientRows(db, recipesIngredients);
        await saveRecipeRecipeRows(db, recipesRecipes);

        await saveTags(
            db,
            recipesToCreate.map(({ recipeId, tags }) => ({
                recipeId,
                tags: tags ?? [],
            })),
        );

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
                    ingredients: serializeJsonField(recipe.ingredients),
                    method: serializeJsonField(toMethodSections(recipe.method)),
                },
                RecipeTable,
            );

            if (updateData) {
                await db(lamington.recipe)
                    .where(RecipeTable.recipeId, recipe.recipeId)
                    .update(updateData);
            }
        }

        const recipesIngredients = recipes.flatMap(
            ({ recipeId, ingredients }) => {
                if (ingredients === null) {
                    return [{ recipeId, ingredients: [] }];
                }
                const rows = extractIngredientIds(ingredients);
                return rows === undefined
                    ? []
                    : [{ recipeId, ingredients: rows }];
            },
        );

        const recipesRecipes = recipes.flatMap(({ recipeId, ingredients }) => {
            if (ingredients === null) {
                return [{ recipeId, recipes: [] }];
            }
            const rows = extractSubRecipeIds(ingredients);
            return rows === undefined ? [] : [{ recipeId, recipes: rows }];
        });

        await saveRecipeIngredientRows(db, recipesIngredients);
        await saveRecipeRecipeRows(db, recipesRecipes);

        await saveTags(
            db,
            recipes.map(({ recipeId, tags }) => ({
                recipeId,
                tags: tags ?? [],
            })),
        );

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

        const recipeList: RecipeListItemRow[] = await buildRecipeQuery(db)
            .select(
                RecipeTable.recipeId,
                RecipeTable.name,
                RecipeTable.timesCooked,
                RecipeTable.cookTime,
                RecipeTable.prepTime,
                RecipeTable.public,
                db.ref(`avg_ratings.${ratingAverageName}`),
                withPersonalRating(db, userId),
            )
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
            .where((builder) => {
                if (!filter.books?.length) return;
                return builder.whereIn(
                    RecipeTable.recipeId,
                    db
                        .select(BookRecipeTable.recipeId)
                        .from(lamington.bookRecipe)
                        .whereIn(
                            BookRecipeTable.bookId,
                            filter.books.map(({ bookId }) => bookId),
                        ),
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
                    cookTime: toUndefined(recipe.cookTime),
                    prepTime: toUndefined(recipe.prepTime),
                    owner: {
                        userId: recipe.createdBy,
                        firstName: recipe.firstName,
                    },
                    rating: formatRating(ratingAverage, ratingPersonal),
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
    tags: ReadonlyArray<RecipeTagRow> | undefined,
): ReadTagsResponse | undefined =>
    tags?.reduce<
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
