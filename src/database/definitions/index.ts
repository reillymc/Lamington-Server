import config from "../../config.ts";
import { attachment } from "./attachment.ts";
import { book } from "./book.ts";
import { bookRecipe } from "./bookRecipe.ts";
import { content } from "./content.ts";
import { contentAttachment } from "./contentAttachment.ts";
import { contentMember } from "./contentMember.ts";
import { contentNote } from "./contentNote.ts";
import { contentTag } from "./contentTag.ts";
import { ingredient } from "./ingredient.ts";
import { lamington } from "./lamington.ts";
import { list } from "./list.ts";
import { listItem } from "./listItem.ts";
import { plannerMeal } from "./meal.ts";
import { planner } from "./planner.ts";
import { recipe } from "./recipe.ts";
import { recipeIngredient } from "./recipeIngredient.ts";
import { recipeRating } from "./recipeRating.ts";
import { recipeSection } from "./recipeSection.ts";
import { recipeStep } from "./recipeStep.ts";
import { tag } from "./tag.ts";
import { user } from "./user.ts";

export const Lamington = {
    [lamington.attachment]: attachment,
    [lamington.book]: book,
    [lamington.bookRecipe]: bookRecipe,
    [lamington.content]: content,
    [lamington.contentAttachment]: contentAttachment,
    [lamington.contentMember]: contentMember,
    [lamington.contentNote]: contentNote,
    [lamington.contentTag]: contentTag,
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
    [lamington.tag]: tag,
    [lamington.user]: user,
} satisfies Record<
    (typeof lamington)[keyof lamington],
    Record<string, unknown>
>;

export type Table<T> = Required<{ [key in keyof T]: string }>;

// READ
export type ReadQuery<T> = T | Array<T>;

export type ReadResponse<T> = Promise<Array<T>>;
export type ReadRequest<
    T extends {},
    K extends keyof T = never,
    C extends Record<string, unknown> = {},
> = ({ [P in K]: T[P] } & C) | Array<{ [P in K]: T[P] } & C>;

export type CreateQuery<T> = T | Array<T>;

export type CreateResponse<T> = Promise<Array<T>>;

export type ServiceParamsDi<
    T extends Record<string, any>,
    K extends keyof T,
> = Exclude<Parameters<T[K]>[1], any[]>;
export type ServiceResponse<
    T extends Record<string, any>,
    K extends keyof T,
> = Awaited<ReturnType<T[K]>> extends {
    result: Array<any>;
}
    ? Awaited<ReturnType<T[K]>>["result"][number]
    : Awaited<ReturnType<T[K]>>[number];

export const PAGE_SIZE = config.app.pageSize;

export * from "./contentTag.ts";
export * from "./ingredient.ts";
export { lamington } from "./lamington.ts";
export * from "./list.ts";
export * from "./listItem.ts";
export * from "./meal.ts";
export * from "./planner.ts";
export * from "./tag.ts";
export * from "./user.ts";
