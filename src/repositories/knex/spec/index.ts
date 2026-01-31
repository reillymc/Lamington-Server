import config from "../../../config.ts";

export const lamington = {
    attachment: "attachment",
    book: "book",
    bookRecipe: "book_recipe",
    content: "content",
    contentAttachment: "content_attachment",
    contentMember: "content_member",
    contentNote: "content_note",
    contentTag: "content_tag",
    ingredient: "ingredient",
    list: "list",
    listItem: "list_item",
    planner: "planner",
    plannerMeal: "planner_meal",
    recipe: "recipe",
    recipeIngredient: "recipe_ingredient",
    recipeRating: "recipe_rating",
    recipeSection: "recipe_section",
    recipeStep: "recipe_step",
    tag: "tag",
    user: "user",
} as const;

export type lamington = typeof lamington;

export type Table<T extends ReadonlyArray<string> = []> = Required<{
    [key in T[number]]: string;
}>;

export const table = <T extends ReadonlyArray<string>>(
    table: lamington[keyof lamington],
    columns: T,
) =>
    Object.fromEntries(
        columns.map((column) => [column, `${table}.${column}`]),
    ) as Table<T>;

export const attachment = table(lamington.attachment, [
    "attachmentId",
    "uri",
    "createdBy",
    "createdAt",
    "updatedAt",
] as const);

export const book = table(lamington.book, [
    "bookId",
    "name",
    "customisations",
    "description",
] as const);

export const bookRecipe = table(lamington.bookRecipe, [
    "bookId",
    "recipeId",
] as const);

export const content = table(lamington.content, [
    "contentId",
    "createdBy",
    "createdAt",
    "updatedAt",
] as const);

export const contentAttachment = table(lamington.contentAttachment, [
    "contentId",
    "attachmentId",
    "displayType",
    "displayId",
    "displayOrder",
] as const);

export const contentMember = table(lamington.contentMember, [
    "contentId",
    "userId",
    "status",
] as const);

export const contentTag = table(lamington.contentTag, [
    "contentId",
    "tagId",
] as const);

export const ingredient = table(lamington.ingredient, [
    "ingredientId",
    "name",
    "description",
] as const);

export const list = table(lamington.list, [
    "listId",
    "name",
    "customisations",
    "description",
] as const);

export const listItem = table(lamington.listItem, [
    "itemId",
    "listId",
    "name",
    "completed",
    "ingredientId",
    "unit",
    "amount",
    "notes",
] as const);

export const contentNote = table(lamington.contentNote, [
    "contentId",
    "authorId",
    "title",
    "content",
    "public",
] as const);

export const plannerMeal = table(lamington.plannerMeal, [
    "mealId",
    "plannerId",
    "year",
    "month",
    "dayOfMonth",
    "meal",
    "description",
    "source",
    "sequence",
    "recipeId",
    "notes",
] as const);

export const planner = table(lamington.planner, [
    "plannerId",
    "name",
    "customisations",
    "description",
] as const);

export const recipe = table(lamington.recipe, [
    "recipeId",
    "name",
    "source",
    "summary",
    "tips",
    "servings",
    "prepTime",
    "cookTime",
    "nutritionalInformation",
    "public",
    "timesCooked",
] as const);

export const recipeIngredient = table(lamington.recipeIngredient, [
    "id",
    "recipeId",
    "sectionId",
    "ingredientId",
    "subrecipeId",
    "index",
    "unit",
    "amount",
    "multiplier",
    "description",
] as const);

export const recipeRating = table(lamington.recipeRating, [
    "recipeId",
    "raterId",
    "rating",
] as const);

export const recipeSection = table(lamington.recipeSection, [
    "recipeId",
    "sectionId",
    "index",
    "name",
    "description",
] as const);

export const recipeStep = table(lamington.recipeStep, [
    "id",
    "recipeId",
    "sectionId",
    "index",
    "description",
] as const);

export const tag = table(lamington.tag, [
    "tagId",
    "name",
    "description",
    "parentId",
] as const);

export const user = table(lamington.user, [
    "userId",
    "email",
    "firstName",
    "lastName",
    "password",
    "createdAt",
    "updatedAt",
    "status",
    "preferences",
] as const);

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
