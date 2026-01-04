import type { Attachment } from "../database/definitions/attachment.ts";
import type { Meal } from "../database/definitions/meal.ts";
import type { Database, User } from "../database/index.ts";
import type { RepositoryService } from "./repository.ts";

type CookListMealResponse = {
    mealId: Meal["mealId"];
    course: "breakfast" | "lunch" | "dinner";
    owner: {
        userId: User["userId"];
        firstName: User["firstName"];
    };
    sequence: Meal["sequence"] | null;
    description: Meal["description"] | null;
    source: Meal["source"] | null;
    recipeId: Meal["recipeId"] | null;
    notes: Meal["notes"] | null;
    heroImage: {
        attachmentId: string;
        uri: string;
    } | null;
};

type ReadAllMealsRequest = {
    userId: User["userId"];
};

type ReadAllMealsResponse = {
    meals: Array<CookListMealResponse>;
};

type CreateCookListMealPayload = {
    course: "breakfast" | "lunch" | "dinner";
    sequence?: Meal["sequence"];
    description?: Meal["description"];
    source?: Meal["source"];
    recipeId?: Meal["recipeId"];
    notes?: Meal["notes"];
    heroImage?: Attachment["attachmentId"];
};

type CreateMealsRequest = {
    userId: User["userId"];
    meals: Readonly<Array<CreateCookListMealPayload>>;
};

type CreateMealsResponse = {
    meals: Array<CookListMealResponse>;
};

type UpdateCookListMealPayload = {
    course?: "breakfast" | "lunch" | "dinner" | null;
    sequence?: Meal["sequence"];
    description?: Meal["description"];
    source?: Meal["source"];
    recipeId?: Meal["recipeId"];
    notes?: Meal["notes"];
    heroImage?: Attachment["attachmentId"] | null;
    mealId: Meal["mealId"];
};

type UpdateMealsRequest = {
    // userId: User["userId"];
    meals: Array<UpdateCookListMealPayload>;
};

type UpdateMealsResponse = {
    meals: Array<CookListMealResponse>;
};

type DeleteMealsRequest = {
    meals: Array<{
        mealId: Meal["mealId"];
    }>;
};

type DeleteMealsResponse = {
    count: number;
};

type VerifyMealPermissionsRequest = {
    userId: User["userId"];
    meals: Array<{
        mealId: Meal["mealId"];
    }>;
};

type VerifyMealPermissionsResponse = {
    userId: User["userId"];
    meals: Array<{
        mealId: Meal["mealId"];
        hasPermissions: boolean;
    }>;
};

export interface CookListRepository<TDatabase extends Database = Database> {
    createMeals: RepositoryService<TDatabase, CreateMealsRequest, CreateMealsResponse>;
    deleteMeals: RepositoryService<TDatabase, DeleteMealsRequest, DeleteMealsResponse>;
    readAllMeals: RepositoryService<TDatabase, ReadAllMealsRequest, ReadAllMealsResponse>;
    updateMeals: RepositoryService<TDatabase, UpdateMealsRequest, UpdateMealsResponse>;
    verifyMealPermissions: RepositoryService<TDatabase, VerifyMealPermissionsRequest, VerifyMealPermissionsResponse>;
}
