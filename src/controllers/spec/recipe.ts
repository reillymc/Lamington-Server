import type { Content } from "../../database/definitions/content.ts";
import type {
    Book,
    DeleteService,
    QueryService,
    ReadService,
    Recipe,
    RecipeIngredient,
    RecipeRating,
    SaveService,
    ServiceResponse,
    Tag,
    User,
} from "../../database/index.ts";
import { RecipeIngredientActions } from "../recipeIngredient.ts";
import { RecipeSectionActions } from "../recipeSection.ts";
import { RecipeStepActions } from "../recipeStep.ts";
import { ContentTagActions } from "../content/contentTag.ts";
import type { RecipeTagActions } from "../recipeTag.ts";

interface Section<T> {
    sectionId: string;
    name: string;
    description?: string;
    items: Array<T>;
}

interface RecipeIngredientItem
    extends Pick<
        RecipeIngredient,
        "id" | "amount" | "description" | "multiplier" | "unit" | "subrecipeId" | "ingredientId"
    > {
    name?: string;
}

export interface RecipeMethodStep {
    id: string;
    description?: string;
}

export type RecipeMethod = Array<Section<RecipeMethodStep>>;

export type ContentTags = { [tagGroup: string]: Partial<Tag> & { tags?: Array<Tag> } };

type RecipeIngredients = Array<Section<RecipeIngredientItem>>;

type SaveRecipe = Omit<Recipe, "createdAt" | "updatedAt">;

interface ReadRecipeResponse
    extends Pick<
        Recipe,
        | "recipeId"
        | "name"
        | "timesCooked"
        | "cookTime"
        | "prepTime"
        | "public"
        | "servings"
        | "source"
        | "summary"
        | "tips"
    > {
    ratingAverage: RecipeRating["rating"];
    ratingPersonal: RecipeRating["rating"];
    ingredients: ServiceResponse<RecipeIngredientActions, "queryByRecipeId">[];
    method: ServiceResponse<RecipeStepActions, "readByRecipeId">[];
    sections: ServiceResponse<RecipeSectionActions, "queryByRecipeId">[];
    tags: ServiceResponse<RecipeTagActions, "readByRecipeId">[];
    createdByName: User["firstName"];
    createdBy: Content["createdBy"];
}

type QueryRecipesResult = Pick<Recipe, "recipeId" | "name" | "timesCooked" | "cookTime" | "prepTime" | "public"> & {
    ratingAverage: RecipeRating["rating"];
    ratingPersonal: RecipeRating["rating"];
    tags: ServiceResponse<ContentTagActions, "readByContentId">[];
    createdByName: User["firstName"];
    createdBy: Content["createdBy"];
};

type RecipeQuerySortOptions = "name" | "ratingPersonal" | "ratingAverage" | "time";

interface RecipeReadSummaryResponse extends Pick<Recipe, "recipeId"> {
    createdBy: Content["createdBy"];
}

export interface RecipeService {
    Delete: DeleteService<Recipe, "recipeId">;

    Save: SaveService<
        SaveRecipe & {
            ingredients?: RecipeIngredients;
            method?: RecipeMethod;
            ratingPersonal?: number;
            tags?: ContentTags;
            createdBy: Content["createdBy"];
        }
    >;

    Read: ReadService<ReadRecipeResponse, "recipeId", Pick<User, "userId">>;

    Query: QueryService<
        QueryRecipesResult,
        Pick<User, "userId"> & { categoryGroups?: Record<string, string[]>; ingredients?: string[] },
        RecipeQuerySortOptions
    >;

    QueryByUser: QueryService<
        QueryRecipesResult,
        Pick<User, "userId"> & { categoryGroups?: Record<string, string[]>; ingredients?: string[] },
        RecipeQuerySortOptions
    >;

    QueryByBook: QueryService<QueryRecipesResult, Pick<User, "userId"> & Pick<Book, "bookId">>;

    /**
     * Get recipes by id or ids
     * @returns an array of recipes matching given ids, but only with minimal required fields to ensure performance
     */
    ReadSummary: ReadService<RecipeReadSummaryResponse, "recipeId">;
}
