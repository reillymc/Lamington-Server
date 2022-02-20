import { Table } from "./lamington";

/**
 * MealStep
 *
 * Contains the mapping of each of the meal's steps in its method to a unique id with its associated properties
 */

export interface MealStepProperties {
   
}

export interface MealStep {
    mealId: string;
    stepId: string;
    section: string;
    index: number;
    description: string | undefined;
}

export const mealStep: Table<MealStep> = {
    mealId: "meal_step.mealId",
    stepId: "meal_step.stepId",
    section: "meal_step.section",
    index: "meal_step.index",
    description: "meal_step.description",
};

