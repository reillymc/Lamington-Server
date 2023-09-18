import {
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
} from "../../database";
import { RecipeIngredientActions } from "../recipeIngredient";
import { RecipeSectionActions } from "../recipeSection";
import { RecipeStepActions } from "../recipeStep";
import { RecipeTagActions } from "../recipeTag";

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
    photo?: string;
}

export type RecipeMethod = Array<Section<RecipeMethodStep>>;

export type RecipeTags = { [tagGroup: string]: Partial<Tag> & { tags?: Array<Tag> } };

type RecipeIngredients = Array<Section<RecipeIngredientItem>>;

type SaveRecipe = Omit<Recipe, "dateCreated" | "dateUpdated">;

interface ReadRecipeResponse
    extends Pick<
        Recipe,
        | "recipeId"
        | "name"
        | "photo"
        | "timesCooked"
        | "cookTime"
        | "prepTime"
        | "dateCreated"
        | "dateUpdated"
        | "public"
        | "createdBy"
        | "servingsLower"
        | "servingsUpper"
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
}

type QueryRecipesResult = Pick<
    Recipe,
    "recipeId" | "name" | "photo" | "timesCooked" | "cookTime" | "prepTime" | "dateCreated" | "public" | "createdBy"
> & {
    ratingAverage: RecipeRating["rating"];
    ratingPersonal: RecipeRating["rating"];
    tags: ServiceResponse<RecipeTagActions, "readByRecipeId">[];
    createdByName: User["firstName"];
};

type RecipeQuerySortOptions = "name" | "ratingPersonal" | "ratingAverage" | "time";

interface RecipeReadSummaryResponse extends Pick<Recipe, "recipeId" | "photo" | "createdBy"> {}

export interface RecipeService {
    Delete: DeleteService<Recipe, "recipeId">;

    Save: SaveService<
        SaveRecipe & {
            ingredients?: RecipeIngredients;
            method?: RecipeMethod;
            ratingPersonal?: number;
            tags?: RecipeTags;
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
