import type { RepositoryMethod } from "./repository.ts";
import type { HeroImage, Owner } from "./types.ts";
import type { User } from "./userRepository.ts";

export type Meal = {
    mealId: string;
    plannerId: string | undefined;
    year: number | undefined;
    month: number | undefined;
    dayOfMonth: number | undefined;
    meal: string;
    description: string | undefined;
    source: string | undefined;
    sequence: number | undefined;
    recipeId: string | undefined;
    notes: string | undefined;
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
        owner: Owner;
        plannerId: Meal["plannerId"];
        year: Meal["year"];
        month: Meal["month"];
        dayOfMonth: Meal["dayOfMonth"];
        description: Meal["description"];
        source: Meal["source"];
        sequence: Meal["sequence"];
        recipeId: Meal["recipeId"];
        notes: Meal["notes"];
        heroImage: HeroImage | undefined;
    }>;
};

export interface MealRepository {
    read: RepositoryMethod<ReadRequest, ReadResponse>;
}
