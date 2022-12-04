import { lamington, Table } from ".";

/**
 * Meal Roster
 */
export type MealRoster = {
    mealId: string;
    assigneeId: string;
    assignerId: string;
    assignmentDate: string;
};

export const mealRoster: Table<MealRoster> = {
    mealId: `${lamington.mealRoster}.mealId`,
    assigneeId: `${lamington.listMember}.assigneeId`,
    assignerId: `${lamington.listMember}.assignerId`,
    assignmentDate: `${lamington.listMember}.assignmentDate`,
} as const;
