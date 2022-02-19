import { Table } from "./lamington";

/**
 * MealStep
 *
 * Contains the mapping of each of the meal's steps in its method to a unique id with its associated properties
 */

export interface MealStepProperties {
    index: number;
    section?: string;
    description?: string;
    notes?: string;
}

export interface MealStep {
    mealId: string;
    stepId: string;
    properties: string | undefined; // Stringified MealStepProperties
}

export const mealStep: Table<MealStep> = {
    mealId: "meal_step.mealId",
    stepId: "meal_step.stepId",
    properties: "meal_step.properties",
};

