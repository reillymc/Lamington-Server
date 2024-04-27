import config from "../../config";

import { book } from "./book";
import { bookMember } from "./bookMember";
import { bookRecipe } from "./bookRecipe";
import { ingredient } from "./ingredient";
import { lamington } from "./lamington";
import { list } from "./list";
import { listItem } from "./listItem";
import { listMember } from "./listMember";
import { plannerMeal } from "./meal";
import { planner } from "./planner";
import { plannerMember } from "./plannerMember";
import { recipe } from "./recipe";
import { recipeIngredient } from "./recipeIngredient";
import { recipeNote } from "./recipeNote";
import { recipeRating } from "./recipeRating";
import { recipeSection } from "./recipeSection";
import { recipeStep } from "./recipeStep";
import { recipeTag } from "./recipeTag";
import { tag } from "./tag";
import { User, user } from "./user";

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

export const PAGE_SIZE = config.database.pageSize ?? 50;

export * from "./book";
export * from "./bookMember";
export * from "./bookRecipe";
export * from "./ingredient";
export * from "./lamington";
export * from "./list";
export * from "./listItem";
export * from "./listMember";
export * from "./meal";
export * from "./planner";
export * from "./plannerMember";
export * from "./recipe";
export * from "./recipeIngredient";
export * from "./recipeRating";
export * from "./recipeSection";
export * from "./recipeStep";
export * from "./recipeTag";
export * from "./tag";
export * from "./user";
