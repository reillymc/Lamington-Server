import type { Attachment } from "../database/definitions/attachment.ts";
import type { Book } from "../database/definitions/book.ts";
import type { Content } from "../database/definitions/content.ts";
import type { Recipe } from "../database/definitions/recipe.ts";
import type { RecipeIngredient } from "../database/definitions/recipeIngredient.ts";
import type { RecipeRating } from "../database/definitions/recipeRating.ts";
import type { RecipeStep } from "../database/definitions/recipeStep.ts";
import type { Database, Ingredient, Tag, User } from "../database/index.ts";
import type { RepositoryService } from "./repository.ts";

// TODO: clean up extraneous exports after migration to openapi spec at service layer is complete
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
    books?: ReadonlyArray<{ bookId: Book["bookId"] }>;
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
