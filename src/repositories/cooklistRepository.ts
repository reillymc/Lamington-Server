import type { Attachment } from "./attachmentRepository.ts";
import type { Meal } from "./mealRepository.ts";
import type { RepositoryMethod } from "./repository.ts";
import type { HeroImage, Owner } from "./types.ts";
import type { User } from "./userRepository.ts";

export type CookListMealCourse =
    | "breakfast"
    | "lunch"
    | "dinner"
    | "snack"
    | "dessert"
    | "drink"
    | "component"
    | "side";

type CookListMealResponse = {
    mealId: Meal["mealId"];
    course: CookListMealCourse;
    owner: Owner;
    sequence: Meal["sequence"];
    description: Meal["description"];
    source: Meal["source"];
    recipeId: Meal["recipeId"];
    notes: Meal["notes"];
    heroImage: HeroImage | undefined;
};

type ReadAllMealsRequest = {
    userId: User["userId"];
};

type ReadAllMealsResponse = {
    meals: ReadonlyArray<CookListMealResponse>;
};

type CreateCookListMealPayload = {
    course: CookListMealCourse;
    sequence?: Meal["sequence"] | null;
    description?: Meal["description"] | null;
    source?: Meal["source"] | null;
    recipeId?: Meal["recipeId"] | null;
    notes?: Meal["notes"] | null;
    heroImage?: Attachment["attachmentId"];
};

type CreateMealsRequest = {
    userId: User["userId"];
    meals: ReadonlyArray<CreateCookListMealPayload>;
};

type CreateMealsResponse = {
    meals: ReadonlyArray<CookListMealResponse>;
};

type UpdateCookListMealPayload = {
    course?: CookListMealCourse | null;
    sequence?: Meal["sequence"] | null;
    description?: Meal["description"] | null;
    source?: Meal["source"] | null;
    recipeId?: Meal["recipeId"] | null;
    notes?: Meal["notes"] | null;
    heroImage?: Attachment["attachmentId"] | null;
    mealId: Meal["mealId"];
};

type UpdateMealsRequest = {
    // userId: User["userId"];
    meals: ReadonlyArray<UpdateCookListMealPayload>;
};

type UpdateMealsResponse = {
    meals: ReadonlyArray<CookListMealResponse>;
};

type DeleteMealsRequest = {
    meals: ReadonlyArray<{
        mealId: Meal["mealId"];
    }>;
};

type DeleteMealsResponse = {
    count: number;
};

type VerifyMealPermissionsRequest = {
    userId: User["userId"];
    meals: ReadonlyArray<{
        mealId: Meal["mealId"];
    }>;
};

type VerifyMealPermissionsResponse = {
    userId: User["userId"];
    meals: ReadonlyArray<{
        mealId: Meal["mealId"];
        hasPermissions: boolean;
    }>;
};

export interface CookListRepository {
    createMeals: RepositoryMethod<CreateMealsRequest, CreateMealsResponse>;
    deleteMeals: RepositoryMethod<DeleteMealsRequest, DeleteMealsResponse>;
    readAllMeals: RepositoryMethod<ReadAllMealsRequest, ReadAllMealsResponse>;
    updateMeals: RepositoryMethod<UpdateMealsRequest, UpdateMealsResponse>;
    verifyMealPermissions: RepositoryMethod<
        VerifyMealPermissionsRequest,
        VerifyMealPermissionsResponse
    >;
}
