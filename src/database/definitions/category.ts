import { Table } from "./lamington";

/**
 * Category
 */
export interface Category {
    id: string;
    type: string;
    name: string;
    notes: string | undefined;
}

export const category: Table<Category> = {
    id: "category.id",
    type: "category.type",
    name: "category.name",
    notes: "category.notes",
} as const;
