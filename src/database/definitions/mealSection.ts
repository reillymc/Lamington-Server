import { Table } from ".";

/**
 * MealSection
 */

export const DefaultSection = "default" as const;    

export interface MealSection {
    mealId: string;
    sectionId: string;
    index: number;
    name: string;
    description: string | undefined;
}

export const mealSection: Table<MealSection> = {
    mealId: "meal_section.mealId",
    sectionId: "meal_section.sectionId",
    index: "meal_section.index",
    name: "meal_section.name",
    description: "meal_section.description",
};
