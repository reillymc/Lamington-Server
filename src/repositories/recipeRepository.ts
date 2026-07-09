import type { Attachment } from "./attachmentRepository.ts";
import type { Ingredient } from "./ingredientRepository.ts";
import type { Database, RepositoryService } from "./repository.ts";
import type { Tag } from "./tagRepository.ts";
import type { Content } from "./temp.ts";
import type { User } from "./userRepository.ts";

interface RecipeStep {
    content: string;
}

type NumberValue = { representation: "number"; value: string };
type RangeValue = { representation: "range"; value: [string, string] };
type FractionValue = {
    representation: "fraction";
    value: [string, string, string];
};

/**
 * RecipeIngredient
 *
 * Contains the mapping for each of the recipe's ingredients to the Ingredient item, with additional
 * information stored in the properties.
 */
export interface RecipeIngredient {
    recipeId: string;
    ingredientId: string;
}

/**
 * RecipeRecipe
 *
 * Contains the mapping for each of the recipe's ingredients to the sub-recipe item, with additional
 * information stored in the properties.
 */
export interface RecipeRecipe {
    recipeId: string;
    subRecipeId: string;
}

type RecipeServings = {
    unit: string;
    count: RangeValue | NumberValue;
};

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
    ingredients: ReadonlyArray<
        ReadSectionItemResponse<ReadIngredientItemResponse>
    > | null;
    method: ReadonlyArray<
        ReadSectionItemResponse<ReadMethodStepResponse>
    > | null;
    nutritionalInformation: Record<string, never> | null;
    summary: string | null;
    tips: string | null;
    public: boolean | null;
    timesCooked: number | null;
}

type RecipeIngredientAmount = RangeValue | NumberValue | FractionValue;

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

type SaveSectionRequest<T> = {
    name?: string;
    description?: string;
    items: ReadonlyArray<T>;
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
    rating?: RecipeRating["rating"] | null;
    ingredients?: ReadonlyArray<
        SaveSectionRequest<
            {
                amount?: RecipeIngredientAmount;
                description?: string;
                name?: string;
                preparation?: string;
                multiplier?: number;
                unit?: string;
            } & (
                | {
                      ingredient?: {
                          ingredientId: RecipeIngredient["ingredientId"];
                      };
                  }
                | {
                      recipe?: { recipeId: RecipeIngredient["recipeId"] };
                  }
            )
        >
    > | null;
    method?: ReadonlyArray<
        SaveSectionRequest<{
            content?: RecipeStep["content"];
        }>
    > | null;
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

type ReadAttachmentResponse = {
    attachmentId: Attachment["attachmentId"];
    uri: Attachment["uri"];
};

type ReadIngredientItemResponse = {
    amount: RecipeIngredientAmount;
    description: string;
    preparation: string;
    multiplier: number;
    unit: string;
    photo: ReadAttachmentResponse | undefined;
} & (
    | {
          ingredient: {
              ingredientId: RecipeIngredient["ingredientId"];
              name: Ingredient["name"];
              namePlural?: Ingredient["namePlural"];
          };
      }
    | {
          recipe: {
              recipeId: Recipe["recipeId"];
              name: Recipe["name"];
          };
      }
);

type ReadMethodStepResponse = {
    content: RecipeStep["content"];
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
            ingredients: Recipe["ingredients"];
            method: Recipe["method"];
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
