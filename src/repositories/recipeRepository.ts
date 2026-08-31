import type { Attachment } from "./attachmentRepository.ts";
import type { Ingredient } from "./ingredientRepository.ts";
import type { Database, RepositoryService } from "./repository.ts";
import type { Tag } from "./tagRepository.ts";
import type { Content } from "./temp.ts";
import type { User } from "./userRepository.ts";

type NumberValue = { representation: "number"; value: string };
type RangeValue = { representation: "range"; value: [string, string] };
type FractionValue = {
    representation: "fraction";
    value: [string, string, string];
};

type RecipeServings = {
    unit: string;
    count: RangeValue | NumberValue;
};

export type RecipeNutrition = {
    servingSize?: string;
    calories?: string;
    carbohydrateContent?: string;
    sugarContent?: string;
    fiberContent?: string;
    proteinContent?: string;
    fatContent?: string;
    saturatedFatContent?: string;
    transFatContent?: string;
    unsaturatedFatContent?: string;
    cholesterolContent?: string;
    sodiumContent?: string;
};

/**
 * Recipe
 */
export interface Recipe {
    recipeId: Content["contentId"];
    name: string;
    source: string | undefined;
    servings: RecipeServings | undefined;
    prepTime: number | undefined;
    cookTime: number | undefined;
    ingredients:
        | ReadonlyArray<RecipeSection<RecipeIngredientItemResponse>>
        | undefined;
    method: ReadonlyArray<RecipeSection<RecipeMethodStepResponse>> | undefined;
    nutritionalInformation: RecipeNutrition | undefined;
    summary: string | undefined;
    tips: string | undefined;
    public: boolean | undefined;
    timesCooked: number | undefined;
}

type RecipeIngredientAmount = RangeValue | NumberValue | FractionValue;

export type RecipeIngredientItemRequest = {
    amount?: RecipeIngredientAmount;
    description?: string;
    unit?: string;
    multiplier?: number;
    name?: string;
    preparation?: string;
    ingredient?: { ingredientId: string };
    recipe?: { recipeId: string };
};

type RecipeMethodStepRequest = {
    content?: string;
};

type RecipeIngredientItemResponse = {
    amount: RecipeIngredientAmount | undefined;
    description: string | undefined;
    unit: string | undefined;
    multiplier: number | undefined;
    name: string | undefined;
    preparation: string | undefined;
    ingredient:
        | {
              ingredientId: string;
              name: string;
              namePlural: string | undefined;
          }
        | undefined;
    recipe: { recipeId: string; name: string } | undefined;
};

export type RecipeMethodStepResponse = {
    content: string;
};

export type RecipeSection<T> = {
    name?: string;
    description?: string;
    items: ReadonlyArray<T>;
};

export interface RecipeRating {
    recipeId: string;
    raterId: string;
    rating: number;
}

type SortKeys<TKeys> = keyof TKeys;
type Pagination = number;

type AdditionalFields = {
    ratingAverage: RecipeRating["rating"];
    ratingPersonal: RecipeRating["rating"];
};

type SaveTagRequest = {
    tagId: Tag["tagId"];
};

type ReadFilters = {
    name?: Recipe["name"];
    owner?: Content["createdBy"];
    tags?: ReadonlyArray<{ tagId: Tag["tagId"] }>;
    books?: ReadonlyArray<{ bookId: string }>;
    ingredients?: ReadonlyArray<{ ingredientId: Ingredient["ingredientId"] }>;
};

type ReadAllRequest = {
    userId: User["userId"];
    page?: Pagination;
    sort?: SortKeys<
        Pick<Recipe, "name" | "cookTime"> &
            Pick<AdditionalFields, "ratingAverage" | "ratingPersonal">
    >;
    order?: "asc" | "desc";
    filter?: ReadFilters;
};

type BaseResponse = {
    recipeId: Recipe["recipeId"];
    name: Recipe["name"];
    cookTime: Recipe["cookTime"];
    prepTime: Recipe["prepTime"];
    owner: {
        userId: User["userId"];
        firstName: User["firstName"];
    };
    rating: {
        average: RecipeRating["rating"] | undefined;
        personal: RecipeRating["rating"] | undefined;
    };
    photo:
        | { attachmentId: Attachment["attachmentId"]; uri: Attachment["uri"] }
        | undefined;
};

type ReadAllResponse = {
    userId: User["userId"];
    nextPage: Pagination | undefined;
    recipes: ReadonlyArray<BaseResponse>;
};

type VerifyPermissionsRequest = {
    userId: User["userId"];
    status: "O";
    recipes: ReadonlyArray<{
        recipeId: Recipe["recipeId"];
    }>;
};

type VerifyPermissionsResponse = {
    userId: User["userId"];
    recipes: ReadonlyArray<{
        recipeId: Recipe["recipeId"];
        hasPermissions: boolean;
    }>;
};

export type RecipePayload = {
    name: Recipe["name"];
    public?: Recipe["public"] | null;
    cookTime?: Recipe["cookTime"] | null;
    nutritionalInformation?: Recipe["nutritionalInformation"] | null;
    prepTime?: Recipe["prepTime"] | null;
    servings?: Recipe["servings"] | null;
    source?: Recipe["source"] | null;
    summary?: Recipe["summary"] | null;
    timesCooked?: Recipe["timesCooked"] | null;
    tips?: Recipe["tips"] | null;
    rating?: RecipeRating["rating"] | null;
    ingredients?: ReadonlyArray<
        RecipeSection<RecipeIngredientItemRequest>
    > | null;
    method?: ReadonlyArray<RecipeSection<RecipeMethodStepRequest>> | null;
    tags?: ReadonlyArray<SaveTagRequest> | null;
    photo?: { attachmentId: Attachment["attachmentId"] } | null;
};

type CreateRequest = {
    userId: User["userId"];
    recipes: ReadonlyArray<RecipePayload>;
};

type CreateResponse = ReadResponse;

type UpdateRequest = {
    userId: User["userId"];
    recipes: ReadonlyArray<
        Partial<RecipePayload> & {
            recipeId: Recipe["recipeId"];
        }
    >;
};

type UpdateResponse = ReadResponse;

type ReadRequest = {
    userId: User["userId"];
    recipes: ReadonlyArray<{
        recipeId: Recipe["recipeId"];
    }>;
};

export type ReadTagsResponse = {
    [tagGroupId: string]: {
        tagId: Tag["tagId"];
        name: Tag["name"] | undefined;
        tags:
            | ReadonlyArray<{
                  tagId: Tag["tagId"];
                  name: Tag["name"];
              }>
            | undefined;
    };
};

type ReadResponse = {
    userId: User["userId"];
    recipes: ReadonlyArray<
        BaseResponse & {
            public: Recipe["public"];
            servings: Recipe["servings"];
            nutritionalInformation: Recipe["nutritionalInformation"];
            source: Recipe["source"];
            summary: Recipe["summary"];
            timesCooked: Recipe["timesCooked"];
            tips: Recipe["tips"];
            ingredients: Recipe["ingredients"];
            method: Recipe["method"];
            tags: ReadTagsResponse | undefined;
        }
    >;
};

type DeleteRequest = {
    recipes: ReadonlyArray<{
        recipeId: Recipe["recipeId"];
    }>;
};

type DeleteResponse = {
    count: number;
};

type SaveRatingRequest = {
    userId: User["userId"];
    ratings: ReadonlyArray<{
        recipeId: RecipeRating["recipeId"];
        rating: RecipeRating["rating"];
    }>;
};

type SaveRatingResponse = {
    userId: User["userId"];
    ratings: ReadonlyArray<{
        recipeId: RecipeRating["recipeId"];
        rating: RecipeRating["rating"];
    }>;
};

export interface RecipeRepository<TDatabase extends Database = Database> {
    readAll: RepositoryService<TDatabase, ReadAllRequest, ReadAllResponse>;
    verifyPermissions: RepositoryService<
        TDatabase,
        VerifyPermissionsRequest,
        VerifyPermissionsResponse
    >;
    read: RepositoryService<TDatabase, ReadRequest, ReadResponse>;
    create: RepositoryService<TDatabase, CreateRequest, CreateResponse>;
    update: RepositoryService<TDatabase, UpdateRequest, UpdateResponse>;
    delete: RepositoryService<TDatabase, DeleteRequest, DeleteResponse>;
    saveRating: RepositoryService<
        TDatabase,
        SaveRatingRequest,
        SaveRatingResponse
    >;
}
