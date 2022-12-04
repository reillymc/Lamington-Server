import { Table } from ".";

/**
 * MealStep
 *
 * Contains the mapping of each of the meal's steps in its method to a unique id with its associated properties
 */

export interface MealStepProperties {}

export interface MealStep {
    id: string;
    mealId: string;
    sectionId: string | undefined;
    stepId: string;
    index: number;
    description: string | undefined;
    photo: string | undefined;
}

export const mealStep: Table<MealStep> = {
    id: "meal_step.id",
    mealId: "meal_step.mealId",
    sectionId: "meal_step.sectionId",
    stepId: "meal_step.stepId",
    index: "meal_step.index",
    description: "meal_step.description",
    photo: "meal_step.photo",
};
