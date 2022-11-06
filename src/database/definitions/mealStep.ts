import { Table } from "./lamington";

/**
 * MealStep
 *
 * Contains the mapping of each of the meal's steps in its method to a unique id with its associated properties
 */

export interface MealStepProperties {}

export interface MealStep {
    id: string;
    mealId: string;
    stepId: string;
    index: number;
    sectionId: string | undefined;
    description: string | undefined;
}

export const mealStep: Table<MealStep> = {
    id: "meal_step.id",
    mealId: "meal_step.mealId",
    stepId: "meal_step.stepId",
    sectionId: "meal_step.sectionId",
    index: "meal_step.index",
    description: "meal_step.description",
};
