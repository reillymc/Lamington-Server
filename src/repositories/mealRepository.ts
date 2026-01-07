import type { Meal } from "../database/definitions/meal.ts";
import type { Database, User } from "../database/index.ts";
import type { RepositoryService } from "./repository.ts";

type ReadRequest = {
    userId: User["userId"];
    meals: ReadonlyArray<{
        mealId: Meal["mealId"];
    }>;
};

type ReadResponse = {
    userId: User["userId"];
    meals: ReadonlyArray<{
        mealId: Meal["mealId"];
        course: "breakfast" | "lunch" | "dinner";
        owner: {
            userId: User["userId"];
            firstName: User["firstName"];
        };
        plannerId: Meal["plannerId"];
        year: Meal["year"];
        month: Meal["month"];
        dayOfMonth: Meal["dayOfMonth"];
        description: Meal["description"];
        source: Meal["source"];
        sequence: Meal["sequence"];
        recipeId: Meal["recipeId"];
        notes: Meal["notes"];
        heroImage?: {
            attachmentId: string;
            uri: string;
        };
    }>;
};

export interface MealRepository<TDatabase extends Database = Database> {
    read: RepositoryService<TDatabase, ReadRequest, ReadResponse>;
}
