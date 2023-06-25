import { book } from "./book";
import { bookMember } from "./bookMember";
import { bookRecipe } from "./bookRecipe";
import { ingredient } from "./ingredient";
import { lamington } from "./lamington";
import { list } from "./list";
import { listItem } from "./listItem";
import { listMember } from "./listMember";
import { planner } from "./planner";
import { plannerMember } from "./plannerMember";
import { plannerMeal } from "./meal";
import { recipe } from "./recipe";
import { recipeIngredient } from "./recipeIngredient";
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
export type ReadRequest<T extends {}, K extends keyof T> = { [P in K]: T[P] } | Array<{ [P in K]: T[P] }>;

export type ReadService<T extends {}, K extends keyof T> = (params: ReadRequest<T, K>) => ReadResponse<T>;

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
export type DeleteRequest<T extends {}, K extends keyof T> = T[K] | Array<T[K]>;
export type DeleteResponse = Promise<number>;

export type DeleteService<T extends {}, K extends keyof T> = (params: DeleteRequest<T, K>) => DeleteResponse;

export * from "./book";
export * from "./bookMember";
export * from "./bookRecipe";
export * from "./ingredient";
export * from "./list";
export * from "./listItem";
export * from "./listMember";
export * from "./planner";
export * from "./plannerMember";
export * from "./meal";
export * from "./recipe";
export * from "./recipeIngredient";
export * from "./recipeRating";
export * from "./recipeSection";
export * from "./recipeStep";
export * from "./recipeTag";
export * from "./tag";
export * from "./user";
export * from "./lamington";
