import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * ContentNote
 *
 * Contains notes left by users on content over time.
 */

export interface ContentNote {
    contentId: string;
    authorId: string;
    title?: number;
    content?: number;
    public?: number;
}

export const contentNote: Table<ContentNote> = {
    contentId: `${lamington.recipeRating}.contentId`,
    authorId: `${lamington.recipeRating}.authorId`,
    title: `${lamington.recipeRating}.title`,
    content: `${lamington.recipeRating}.content`,
    public: `${lamington.recipeRating}.public`,
};
