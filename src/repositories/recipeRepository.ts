import type { Attachment } from "./attachmentRepository.ts";
import type { Database, RepositoryService } from "./repository.ts";
import type { Tag } from "./tagRepository.ts";
import type { Content } from "./temp.ts";
import type { User } from "./userRepository.ts";

export interface RecipeStep {
    id: string;
    recipeId: string;
    sectionId: string | undefined;
    index: number;
    description: string | undefined;
}

type NumberValue = { representation: "number"; value: string };
type RangeValue = { representation: "range"; value: [string, string] };
type FractionValue = {
    representation: "fraction";
    value: [string, string, string];
};

export interface RecipeSection {
    recipeId: string;
    sectionId: string;
    index: number;
    name: string;
    description: string | undefined;
}

/**
 * RecipeIngredient
 *
 * Contains the mapping for each of the recipe's ingredients to the Ingredient item, with additional
 * information stored in the properties.
 */
export interface RecipeIngredient {
    id: string;
    recipeId: string;
    sectionId: string;

    /**
     * Used when linking an ingredient item
     */
    ingredientId?: string;

    /**
     * Used when linking another recipe as an ingredient
     */
    subrecipeId?: string;
    index?: number;
    unit?: string;

    /**
     * JSON stringified object containing the amount of the ingredient, as type number, fraction
     * or range with its representation explicitly denoted.
     * TODO: Define this type correctly like other new json types
     */
    amount?: RecipeIngredientAmount;
    multiplier?: number;
    description?: string;
}

type RecipeServingsV1 = {
    unit: string;
    count: RangeValue | NumberValue;
};

type RecipeServings = RecipeServingsV1;

/**
 * Recipe
 */
export interface Recipe {
    recipeId: Content["contentId"];
    name: string;
    source: string | null;
    servings: RecipeServings | null;
    prepTime: number | null;
    cookTime: number | null;
    nutritionalInformation: string | null;
    summary: string | null;
    tips: string | null;
    public: boolean;
    timesCooked: number | null;
}

type RecipeIngredientAmountV1 = RangeValue | NumberValue | FractionValue;

type RecipeIngredientAmount = RecipeIngredientAmountV1;

export interface RecipeRating {
    recipeId: string;
    raterId: string;
    rating: number;
}

interface Ingredient {
    ingredientId: string;
    name: string;
    description: string | undefined;
}

type SortKeys<TKeys> = keyof TKeys;
type Pagination = number;

type AdditionalFields = {
    ratingAverage: RecipeRating["rating"];
    ratingPersonal: RecipeRating["rating"];
};

type SaveIngredientItemRequest = {
    id: RecipeIngredient["id"];
    amount?: RecipeIngredient["amount"];
    description?: RecipeIngredient["description"];
    multiplier?: RecipeIngredient["multiplier"];
    unit?: RecipeIngredient["unit"];
    subrecipeId?: RecipeIngredient["subrecipeId"];
    ingredientId?: RecipeIngredient["ingredientId"]; // TODO: deprecate and remove, along with ingredient table
    name?: Ingredient["name"];
};

type SaveMethodStepRequest = {
    id: RecipeStep["id"];
    description?: RecipeStep["description"];
};

type SaveTagRequest = {
    tagId: Tag["tagId"];
};

type SaveSectionRequest<T> = {
    sectionId: string;
    name: string;
    description?: string;
    items: ReadonlyArray<T>;
};

type ReadFilters = {
    name?: Recipe["name"];
    owner?: Content["createdBy"];
    tags?: ReadonlyArray<{ tagId: Tag["tagId"] }>;
    books?: ReadonlyArray<{ bookId: string }>;
    ingredients?: ReadonlyArray<{ name: Ingredient["name"] }>;
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
    public: Recipe["public"];
    cookTime: Recipe["cookTime"];
    prepTime: Recipe["prepTime"];
    servings: Recipe["servings"];
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

type RecipePayload = {
    name: Recipe["name"];
    public?: Recipe["public"];
    cookTime?: Recipe["cookTime"];
    nutritionalInformation?: Recipe["nutritionalInformation"];
    prepTime?: Recipe["prepTime"];
    servings?: Recipe["servings"];
    source?: Recipe["source"];
    summary?: Recipe["summary"];
    timesCooked?: Recipe["timesCooked"];
    tips?: Recipe["tips"];
    rating?: RecipeRating["rating"];
    ingredients?: ReadonlyArray<SaveSectionRequest<SaveIngredientItemRequest>>;
    method?: ReadonlyArray<SaveSectionRequest<SaveMethodStepRequest>>;
    tags?: ReadonlyArray<SaveTagRequest>;
    photo?: { attachmentId: Attachment["attachmentId"] };
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

type ReadAttachmentResponse = {
    attachmentId: Attachment["attachmentId"];
    uri: Attachment["uri"];
};

type ReadIngredientItemResponse = {
    id: RecipeIngredient["id"];
    amount: RecipeIngredient["amount"] | undefined;
    description: RecipeIngredient["description"] | undefined;
    multiplier: RecipeIngredient["multiplier"] | undefined;
    unit: RecipeIngredient["unit"] | undefined;
    subrecipeId: RecipeIngredient["subrecipeId"] | undefined;
    ingredientId: RecipeIngredient["ingredientId"] | undefined;
    name: Ingredient["name"] | undefined;
    photo: ReadAttachmentResponse | undefined;
};

type ReadMethodStepResponse = {
    id: RecipeStep["id"];
    description: RecipeStep["description"];
    photo: ReadAttachmentResponse;
};

type ReadTagsResponse = {
    [tagGroupId: string]: {
        tagId: Tag["tagId"];
        name: Tag["name"];
        description: Tag["description"] | undefined;
        tags: ReadonlyArray<Tag>;
    };
};

type ReadSectionItemResponse<T> = {
    sectionId: string;
    name: string;
    items: ReadonlyArray<T>;
    description: string | undefined;
    photo: ReadAttachmentResponse | undefined;
};

type ReadResponse = {
    userId: User["userId"];
    recipes: ReadonlyArray<
        BaseResponse & {
            nutritionalInformation: Recipe["nutritionalInformation"];
            source: Recipe["source"];
            summary: Recipe["summary"];
            timesCooked: Recipe["timesCooked"];
            tips: Recipe["tips"];
            ingredients: ReadonlyArray<
                ReadSectionItemResponse<ReadIngredientItemResponse>
            >;
            method: ReadonlyArray<
                ReadSectionItemResponse<ReadMethodStepResponse>
            >;
            tags: ReadTagsResponse;
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
