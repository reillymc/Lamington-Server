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
import { plannerMeal } from "./plannerMeal";
import { recipe } from "./recipe";
import { recipeIngredient } from "./recipeIngredient";
import { recipeRating } from "./recipeRating";
import { recipeSection } from "./recipeSection";
import { recipeStep } from "./recipeStep";
import { recipeTag } from "./recipeTag";
import { tag } from "./tag";
import { user } from "./user";

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

export type Table<T> = { [key in keyof T]: string };

export type ReadQuery<T> = T | Array<T>;

export type CreateQuery<T> = T | Array<T>;

export type ReadResponse<T> = Promise<Array<T>>;

export type CreateResponse<T> = Promise<Array<T>>;

export type DeleteResponse = Promise<number>;

export * from "./book";
export * from "./bookMember";
export * from "./bookRecipe";
export * from "./ingredient";
export * from "./list";
export * from "./listItem";
export * from "./listMember";
export * from "./planner";
export * from "./plannerMember";
export * from "./plannerMeal";
export * from "./recipe";
export * from "./recipeIngredient";
export * from "./recipeRating";
export * from "./recipeSection";
export * from "./recipeStep";
export * from "./recipeTag";
export * from "./tag";
export * from "./user";
export * from "./lamington";
