import type { Attachment } from "../database/definitions/attachment.ts";
import type { Meal } from "../database/definitions/meal.ts";
import type { Database, User } from "../database/index.ts";
import type { RepositoryService } from "./repository.ts";

export type CookListMealResponse = {
    mealId: Meal["mealId"];
    course: "breakfast" | "lunch" | "dinner";
    owner: {
        userId: User["userId"];
        firstName: User["firstName"];
    };
    sequence?: Meal["sequence"];
    description?: Meal["description"];
    source?: Meal["source"];
    recipeId?: Meal["recipeId"];
    notes?: Meal["notes"];
    heroImage?: {
        attachmentId: string;
        uri: string;
    };
};

export type ReadAllMealsRequest = {
    userId: User["userId"];
};

export type ReadAllMealsResponse = {
    meals: Array<CookListMealResponse>;
};

export type CreateCookListMealPayload = {
    course: "breakfast" | "lunch" | "dinner";
    sequence?: Meal["sequence"] | null;
    description?: Meal["description"];
    source?: Meal["source"];
    recipeId?: Meal["recipeId"];
    notes?: Meal["notes"];
    heroImage?: Attachment["attachmentId"];
};

export type CreateMealsRequest = {
    userId: User["userId"];
    meals: Readonly<Array<CreateCookListMealPayload>>;
};

export type CreateMealsResponse = {
    meals: Array<CookListMealResponse>;
};

export type UpdateCookListMealPayload = Partial<CreateCookListMealPayload> & {
    mealId: Meal["mealId"];
};

export type UpdateMealsRequest = {
    // userId: User["userId"];
    meals: Array<UpdateCookListMealPayload>;
};

export type UpdateMealsResponse = {
    meals: Array<CookListMealResponse>;
};

export type DeleteMealsRequest = {
    meals: Array<{
        mealId: Meal["mealId"];
    }>;
};

export type DeleteMealsResponse = {
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
