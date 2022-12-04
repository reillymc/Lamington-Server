import { Table } from ".";

/**
 * Category
 */
export interface Category {
    categoryId: string;
    type: string;
    name: string;
    notes: string | undefined;
}

export const category: Table<Category> = {
    categoryId: "category.categoryId",
    type: "category.type",
    name: "category.name",
    notes: "category.notes",
} as const;
