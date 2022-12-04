import { lamington, Table } from ".";

/**
 * Recipe Roster
 */
export type RecipeRoster = {
    id: string;
    recipeId: string;
    createdBy: string;
    dateAdded: string;
    assigneeId: string | undefined;
    cookDate: string | undefined;
    notes: string | undefined;
};

export const recipeRoster: Table<RecipeRoster> = {
    id: `${lamington.recipeRoster}.id`,
    recipeId: `${lamington.recipeRoster}.recipeId`,
    createdBy: `${lamington.recipeRoster}.createdBy`,
    dateAdded: `${lamington.listMember}.assignerId`,
    assigneeId: `${lamington.listMember}.assigneeId`,
    cookDate: `${lamington.listMember}.cookDate`,
    notes: `${lamington.listMember}.notes`,
} as const;
