import {
    EnsureArray,
    ObjectFromEntries,
    Undefined,
} from "../../utils/index.ts";
import type {
    Recipe,
    RecipeIngredient,
    RecipeRating,
    RecipeRepository,
    RecipeSection,
    RecipeStep,
} from "../recipeRepository.ts";
import type { Content, ContentTag } from "../temp.ts";
import type { User } from "../userRepository.ts";
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
import type { KnexDatabase } from "./knex.ts";
import {
    BookRecipeTable,
    ContentTable,
    ContentTagTable,
    IngredientTable,
    lamington,
    RecipeIngredientTable,
    RecipeRatingTable,
    RecipeStepTable,
    RecipeTable,
} from "./spec/index.ts";

const DefaultSection = "default";

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
) =>
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

const readStepsByRecipeId = async (db: KnexDatabase, recipeId: string) =>
    db<RecipeStep>(lamington.recipeStep)
        .where({ [RecipeStepTable.recipeId]: recipeId })
        .select(
            RecipeStepTable.id,
            RecipeStepTable.sectionId,
            RecipeStepTable.index,
            RecipeStepTable.description,
        );

/**
 * Update RecipeSteps for recipeId, by deleting all steps not in step list and then creating / updating provided steps in list
 * @param recipeId recipe to modify
 * @param recipeSteps steps to include in recipe
 */
const saveRecipeStepRows = async (
    db: KnexDatabase,
    params: Pick<Recipe, "recipeId"> & {
        recipeSteps: ReadonlyArray<RecipeStep>;
    },
) => {
    const deleteExcessRows = async (
        recipeId: string,
        retainedStepIds: string[],
    ) =>
        db<RecipeStep>(lamington.recipeStep)
            .where({ recipeId })
            .whereNotIn("id", retainedStepIds)
            .del();

    const insertRows = async (recipeSteps: ReadonlyArray<RecipeStep>) =>
        db<RecipeStep>(lamington.recipeStep)
            .insert(recipeSteps)
            .onConflict(["recipeId", "id"])
            .merge();

    await deleteExcessRows(
        params.recipeId,
        params.recipeSteps.map(({ id }) => id),
    );
    if (params.recipeSteps.length > 0) await insertRows(params.recipeSteps);
};

/**
 * Get all ingredients for a recipe
 * @param recipeId recipe to retrieve ingredients from
 * @returns RecipeIngredient
 */
const queryRecipeIngredientsByRecipeId = async (
    db: KnexDatabase,
    { recipeId }: Pick<Recipe, "recipeId">,
) => {
    const data = await db(lamington.recipeIngredient)
        .where({ [RecipeIngredientTable.recipeId]: recipeId })
        .select(
            RecipeIngredientTable.id,
            RecipeIngredientTable.ingredientId,
            RecipeIngredientTable.subrecipeId,
            `${RecipeTable.name} as recipeName`,
            `${IngredientTable.name} as ingredientName`,
            RecipeIngredientTable.sectionId,
            RecipeIngredientTable.index,
            RecipeIngredientTable.description,
            RecipeIngredientTable.unit,
            RecipeIngredientTable.amount,
            RecipeIngredientTable.multiplier,
        )
        .leftJoin(
            lamington.ingredient,
            RecipeIngredientTable.ingredientId,
            IngredientTable.ingredientId,
        )
        .leftJoin(
            lamington.recipe,
            RecipeIngredientTable.subrecipeId,
            RecipeTable.recipeId,
        );

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
    params: Pick<Recipe, "recipeId"> & {
        ingredients: Array<Omit<RecipeIngredient, "recipeId">>;
    },
) => {
    const recipeIngredients = EnsureArray(params);

    const deleteExcessRows = async (recipeId: string, retainedIds: string[]) =>
        db<RecipeIngredient>(lamington.recipeIngredient)
            .where({ recipeId })
            .whereNotIn("id", retainedIds)
            .delete();

    const insertRows = async (recipeIngredients: RecipeIngredient[]) =>
        db<RecipeIngredient>(lamington.recipeIngredient)
            .insert(recipeIngredients)
            .onConflict(["id", "recipeId"])
            .merge();

    for (const { recipeId, ingredients } of recipeIngredients) {
        await deleteExcessRows(
            recipeId,
            ingredients.map(({ id }) => id).filter(Undefined),
        );
    }

    const ingredients = recipeIngredients.flatMap(({ recipeId, ingredients }) =>
        ingredients.map(
            (recipeIngredient): RecipeIngredient => ({
                ...recipeIngredient,
                recipeId,
            }),
        ),
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
    params: Pick<Recipe, "recipeId"> & {
        sections: Array<Omit<RecipeSection, "recipeId">>;
    },
) => {
    const deleteExcessRows = async (
        recipeId: string,
        retainedSectionIds: string[],
    ) =>
        db<RecipeSection>(lamington.recipeSection)
            .where({ recipeId })
            .whereNotIn("sectionId", retainedSectionIds)
            .del();

    const insertRows = async (recipeSections: RecipeSection[]) =>
        db<RecipeSection>(lamington.recipeSection)
            .insert(recipeSections)
            .onConflict(["recipeId", "sectionId"])
            .merge();

    const recipeSections = EnsureArray(params);

    for (const { recipeId, sections } of recipeSections) {
        await deleteExcessRows(
            recipeId,
            sections.map(({ sectionId }) => sectionId),
        );
    }

    const sections = recipeSections.flatMap(({ recipeId, sections }) =>
        sections.map((section): RecipeSection => ({ ...section, recipeId })),
    );

    if (sections.length > 0) await insertRows(sections);

    return [];
};

/**
 * Get all method steps for a recipe
 * @param recipeId recipe to retrieve steps from
 * @returns RecipeSection array
 */
const querySectionsByRecipeId = async (
    db: KnexDatabase,
    { recipeId }: Pick<Recipe, "recipeId">,
) => {
    const result = await db<RecipeSection>(lamington.recipeSection)
        .where({ recipeId })
        .select("recipeId", "sectionId", "index", "name", "description");

    return { result };
};

const ratingPersonalName = "rating_personal";
const ratingAverageName = "rating_average";

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
          firstName: User["firstName"];
          createdBy: Content["createdBy"];
          heroAttachmentId?: string;
          heroAttachmentUri?: string;
      })
    | undefined;

const getFullRecipe = async (
    db: KnexDatabase,
    recipeId: string,
    userId: string,
): Promise<GetFullRecipeResults> => {
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

const formatRecipe = (recipe: any) => ({
    recipeId: recipe.recipeId,
    name: recipe.name,
    cookTime: toUndefined(recipe.cookTime),
    prepTime: toUndefined(recipe.prepTime),
    servings: toUndefined(recipe.servings),
    source: toUndefined(recipe.source),
    summary: toUndefined(recipe.summary),
    tips: toUndefined(recipe.tips),
    timesCooked: recipe.timesCooked,
    public: recipe.public,
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
        const [
            recipe,
            tags,
            { result: ingredients },
            method,
            { result: sections },
        ] = await Promise.all([
            getFullRecipe(db, recipeId, userId),
            readTags(db, { recipeId }),
            queryRecipeIngredientsByRecipeId(db, { recipeId }),
            readStepsByRecipeId(db, recipeId),
            querySectionsByRecipeId(db, { recipeId }),
        ]);

        if (!recipe) continue;

        response.push({
            ...formatRecipe(recipe),
            rating: {
                average: recipe[ratingAverageName]
                    ? parseFloat(recipe[ratingAverageName])
                    : undefined,
                personal: toUndefined(recipe[ratingPersonalName]),
            },
            ingredients: recipeIngredientRowsToResponse({
                ingredients,
                sections,
            }),
            method: recipeStepRowsToResponse({ method, sections }),
            tags: ContentTagRowsToResponse(tags),
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
                prepTime: recipe.prepTime,
                servings: recipe.servings,
                source: recipe.source,
                summary: recipe.summary,
                timesCooked: recipe.timesCooked,
                tips: recipe.tips,
            })),
        );

        const recipesSections = recipesToCreate.map((recipeItem) => ({
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

        const recipesIngredients = recipesToCreate.map((recipeItem) => ({
            recipeId: recipeItem.recipeId,
            rows: recipeIngredientsRequestToRows(recipeItem),
        }));
        for (const { recipeId, rows } of recipesIngredients) {
            if (rows)
                await saveRecipeIngredientRows(db, {
                    recipeId,
                    ingredients: rows,
                });
        }

        const recipesSteps = recipesToCreate.map((recipeItem) => ({
            recipeId: recipeItem.recipeId,
            rows: recipeMethodRequestToRows(recipeItem),
        }));
        for (const { recipeId, rows } of recipesSteps) {
            if (rows)
                await saveRecipeStepRows(db, { recipeId, recipeSteps: rows });
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
        for (const r of recipes) {
            const updateData = buildUpdateRecord(r, RecipeTable);

            if (updateData) {
                await db(lamington.recipe)
                    .where(RecipeTable.recipeId, r.recipeId)
                    .update(updateData);
            }
        }

        const recipesSections = recipes.map((recipeItem) => ({
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

        const recipesIngredients = recipes.map((recipeItem) => ({
            recipeId: recipeItem.recipeId,
            rows: recipeIngredientsRequestToRows(recipeItem),
        }));
        for (const { recipeId, rows } of recipesIngredients) {
            if (rows)
                await saveRecipeIngredientRows(db, {
                    recipeId,
                    ingredients: rows,
                });
        }

        const recipesSteps = recipes.map((recipeItem) => ({
            recipeId: recipeItem.recipeId,
            rows: recipeMethodRequestToRows(recipeItem),
        }));
        for (const { recipeId, rows } of recipesSteps) {
            if (rows)
                await saveRecipeStepRows(db, { recipeId, recipeSteps: rows });
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

        const results = await read(db, { userId, recipes });

        return { userId, recipes: results.recipes };
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

        const query = RecipeBase(db, userId)
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
            // .where(builder => {
            //     if (!filter.ingredients?.length) return;
            //     return builder.whereIn(
            //         recipe.recipeId,
            //         db
            //             .select(recipeIngredientTable.recipeId)
            //             .from(lamington.recipeIngredient)
            //             .whereIn(
            //                 recipeIngredientTable.description,
            //                 filter.ingredients.map(({ name }) => name)
            //             )
            //             .groupBy(recipeIngredientTable.recipeId)
            //     );
            // })
            .orderBy([{ column: sortColumn, order }, RecipeTable.recipeId])
            .modify(withPagination({ page, pageSize: PAGE_SIZE }));

        if (filter.books?.length) {
            query
                .leftJoin(
                    lamington.bookRecipe,
                    RecipeTable.recipeId,
                    BookRecipeTable.recipeId,
                )
                .whereIn(
                    BookRecipeTable.bookId,
                    filter.books.map(({ bookId }) => bookId),
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
                }: any) => ({
                    ...formatRecipe(recipe),
                    rating: {
                        average: ratingAverage
                            ? parseFloat(ratingAverage)
                            : undefined,
                        personal: toUndefined(ratingPersonal),
                    },
                    tags: ContentTagRowsToResponse(
                        recipeCategoriesList.filter(
                            (cat) =>
                                !cat.parentId ||
                                cat.recipeId === recipe.recipeId,
                        ),
                    ),
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

const recipeSectionRequestToRows = ({
    recipeId,
    ingredients = [],
    method = [],
}: Parameters<RecipeRepository["update"]>["1"]["recipes"][number] & {
    recipeId: string;
}): Array<RecipeSection> | undefined => {
    const ingSectionRequests: Array<RecipeSection> =
        ingredients?.map(({ sectionId, name, description }, index) => ({
            sectionId,
            recipeId,
            name,
            description,
            index,
        })) ?? [];
    const methodSectionRequests: Array<RecipeSection> =
        method?.map(({ sectionId, name, description }, index) => ({
            sectionId,
            recipeId,
            name,
            description,
            index,
        })) ?? [];

    const sectionRequests = [...ingSectionRequests, ...methodSectionRequests];

    // Recipes used to be saved with the default ingredient and method sections sharing the same id.
    // Postgres does not sup[port multiple updates to the same row in one query so only one section data will be saved.
    // This should be fine as these default sections don't currently have any customisation.
    const uniqueSections = Array.from(
        new Set(sectionRequests.map(({ sectionId }) => sectionId)),
    )
        .map((sectionId) =>
            sectionRequests.find(({ sectionId: id }) => id === sectionId),
        )
        .filter(Undefined);

    if (!uniqueSections.length) return;

    return uniqueSections;
};

const recipeIngredientsRequestToRows = ({
    recipeId,
    ingredients,
}: Parameters<RecipeRepository["update"]>["1"]["recipes"][number]):
    | RecipeIngredient[]
    | undefined => {
    if (!ingredients?.length) return;

    return ingredients.flatMap(({ sectionId, items }) =>
        items
            .map((ingItem, index) => {
                if (!ingItem.ingredientId && !ingItem.subrecipeId)
                    return undefined;
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
            .filter(Undefined),
    );
};

const recipeMethodRequestToRows = ({
    recipeId,
    method,
}: {
    recipeId: string;
    method?: ReadonlyArray<any> | null;
}): ReadonlyArray<RecipeStep> | undefined => {
    if (!method?.length) return;

    return method.flatMap(({ sectionId, items }) =>
        (items as any[]).map(
            ({ id, description }, index): RecipeStep => ({
                id,
                recipeId,
                sectionId,
                index,
                description,
            }),
        ),
    );
};

const recipeIngredientRowsToResponse = ({
    sections,
    ingredients,
}: any): any => {
    const recipeIngredients: any = (sections as any[])
        .sort((a, b) => (a.name === DefaultSection ? -1 : a.index - b.index))
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description: toUndefined(description),
            items: ingredients
                .filter((ingredient: any) => ingredient.sectionId === sectionId)
                .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
                .map((ingredient: any) => ({
                    description: toUndefined(ingredient.description),
                    subrecipeId: toUndefined(ingredient.subrecipeId),
                    multiplier: toUndefined(ingredient.multiplier),
                    unit: toUndefined(ingredient.unit),
                    amount: toUndefined(ingredient.amount),
                    ingredientId: toUndefined(ingredient.ingredientId),
                })),
        }))
        .filter(({ items, name }) =>
            name === DefaultSection ? true : items.length,
        );

    return recipeIngredients;
};

const recipeStepRowsToResponse = ({ sections, method }: any): any => {
    const recipeMethod: any = (sections as any[])
        .sort((a, b) => (a.name === DefaultSection ? -1 : a.index - b.index))
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description: toUndefined(description),
            items: method
                .filter((method: any) => method.sectionId === sectionId)
                .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
                .map((step: any) => ({
                    id: step.id,
                    description: toUndefined(step.description),
                })),
        }))
        .filter(({ items, name }) =>
            name === DefaultSection ? true : items.length,
        );

    return recipeMethod;
};

const ContentTagRowsToResponse = (tags: any): any => {
    const groupedTags: any = tags.reduce(
        (acc: any, { tagId, parentId, name }: any) => {
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
        },
        {} as any,
    );

    return ObjectFromEntries(
        groupedTags,
        (data) =>
            data
                .map(([id, value]) =>
                    value.tags?.length ? [id, value] : undefined,
                )
                .filter(Undefined) as unknown as [string, any][],
    );
};
