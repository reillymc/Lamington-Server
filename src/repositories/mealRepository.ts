import type { Database, RepositoryService } from "./repository.ts";
import type { User } from "./userRepository.ts";

export type Meal = {
    mealId: string;
    plannerId: string | null;
    year: number | null;
    month: number | null;
    dayOfMonth: number | null;
    meal: string;
    description: string | null;
    source: string | null;
    sequence: number | null;
    recipeId: string | null;
    notes: string | null;
};

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
