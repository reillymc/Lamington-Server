import config from "../../config.ts";

import { book } from "./book.ts";
import { bookMember } from "./bookMember.ts";
import { bookRecipe } from "./bookRecipe.ts";
import { ingredient } from "./ingredient.ts";
import { lamington } from "./lamington.ts";
import { list } from "./list.ts";
import { listItem } from "./listItem.ts";
import { listMember } from "./listMember.ts";
import { plannerMeal } from "./meal.ts";
import { planner } from "./planner.ts";
import { plannerMember } from "./plannerMember.ts";
import { recipe } from "./recipe.ts";
import { recipeIngredient } from "./recipeIngredient.ts";
import { recipeNote } from "./recipeNote.ts";
import { recipeRating } from "./recipeRating.ts";
import { recipeSection } from "./recipeSection.ts";
import { recipeStep } from "./recipeStep.ts";
import { recipeTag } from "./recipeTag.ts";
import { tag } from "./tag.ts";
import { type User, user } from "./user.ts";

export const LamingtonMemberTables = {
    [lamington.bookMember]: bookMember,
    [lamington.listMember]: listMember,
    [lamington.plannerMember]: plannerMember,
};

export const Lamington = {
    [lamington.book]: book,
    [lamington.bookRecipe]: bookRecipe,
    [lamington.ingredient]: ingredient,
    [lamington.list]: list,
    [lamington.listItem]: listItem,
    [lamington.planner]: planner,
    [lamington.plannerMeal]: plannerMeal,
    [lamington.recipe]: recipe,
    [lamington.recipeIngredient]: recipeIngredient,
    [lamington.recipeRating]: recipeRating,
    [lamington.recipeNote]: recipeNote,
    [lamington.recipeSection]: recipeSection,
    [lamington.recipeStep]: recipeStep,
    [lamington.recipeTag]: recipeTag,
    [lamington.tag]: tag,
    [lamington.user]: user,
    ...LamingtonMemberTables,
} satisfies Record<lamington, Record<string, unknown>>;

export type Table<T> = Required<{ [key in keyof T]: string }>;

// READ
export type ReadQuery<T> = T | Array<T>;

export type ReadResponse<T> = Promise<Array<T>>;
export type ReadRequest<T extends {}, K extends keyof T = never, C extends Record<string, unknown> = {}> =
    | ({ [P in K]: T[P] } & C)
    | Array<{ [P in K]: T[P] } & C>;

export type ReadService<T extends {}, K extends keyof T = never, C extends Record<string, unknown> = {}> = (
    params: ReadRequest<T, K, C>
) => ReadResponse<T>;

// QUERY
export type DefaultSortOptions = "name" | "date";
export type QueryMetadata<TSort extends string = DefaultSortOptions> = {
    page?: number;
    search?: string;
    sort?: TSort;
    order?: "asc" | "desc";
};

export type QueryRequest<R extends {}, TSort extends string = DefaultSortOptions> = R & QueryMetadata<TSort>;

export type QueryService<T extends {}, R extends {} = {}, TSort extends string = DefaultSortOptions> = (
    params: QueryRequest<R, TSort>
) => Promise<{ result: Array<T>; nextPage?: number }>;

// READ MY
export type ReadMyRequest<T extends {}, K extends keyof T = never> =
    | (Record<K, T[K]> & Pick<User, "userId">)
    | (Record<K, Array<T[K]>> & Pick<User, "userId">);

export type ReadMyService<T extends {}, K extends keyof T = never> = (params: ReadMyRequest<T, K>) => ReadResponse<T>;

// SAVE
export type SaveRequest<T> = T | Array<T>;
export type SaveResponse<T> = Promise<Array<T>>;

export type SaveService<T> = (params: SaveRequest<T>) => SaveResponse<T>;

export type CreateQuery<T> = T | Array<T>;

export type CreateResponse<T> = Promise<Array<T>>;

// DELETE
export type DeleteRequest<T extends {}, K extends keyof T> = { [k in K]: T[k] } | Array<{ [k in K]: T[k] }>;
export type DeleteResponse = Promise<number>;

export type DeleteService<T extends {}, K extends keyof T> = (params: DeleteRequest<T, K>) => DeleteResponse;

// Helpers
export type ServiceParams<T extends Record<string, any>, K extends keyof T> = Exclude<Parameters<T[K]>[0], any[]>;
export type ServiceResponse<T extends Record<string, any>, K extends keyof T> = Awaited<ReturnType<T[K]>> extends {
    result: Array<any>;
}
    ? Awaited<ReturnType<T[K]>>["result"][number]
    : Awaited<ReturnType<T[K]>>[number];

export const PAGE_SIZE = config.app.pageSize;

export * from "./book.ts";
export * from "./bookMember.ts";
export * from "./bookRecipe.ts";
export * from "./ingredient.ts";
export { lamington } from "./lamington.ts";
export * from "./list.ts";
export * from "./listItem.ts";
export * from "./listMember.ts";
export * from "./meal.ts";
export * from "./planner.ts";
export * from "./plannerMember.ts";
export * from "./recipe.ts";
export * from "./recipeIngredient.ts";
export * from "./recipeRating.ts";
export * from "./recipeSection.ts";
export * from "./recipeStep.ts";
export * from "./recipeTag.ts";
export * from "./tag.ts";
export * from "./user.ts";
