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

const table = <T extends ReadonlyArray<string>>(
    table: lamington[keyof lamington],
    columns: T,
) =>
    Object.fromEntries(
        columns.map((column) => [column, `${table}.${column}`] as const),
    ) as Table<T>;

export const AttachmentTable = table(lamington.attachment, [
    "attachmentId",
    "uri",
    "createdBy",
    "createdAt",
    "updatedAt",
] as const);

export const BookTable = table(lamington.book, [
    "bookId",
    "name",
    "customisations",
    "description",
] as const);

export const BookRecipeTable = table(lamington.bookRecipe, [
    "bookId",
    "recipeId",
] as const);

export const ContentTable = table(lamington.content, [
    "contentId",
    "createdBy",
    "createdAt",
    "updatedAt",
] as const);

export const ContentAttachmentTable = table(lamington.contentAttachment, [
    "contentId",
    "attachmentId",
    "displayType",
    "displayId",
    "displayOrder",
] as const);

export const ContentMemberTable = table(lamington.contentMember, [
    "contentId",
    "userId",
    "status",
] as const);

export const ContentTagTable = table(lamington.contentTag, [
    "contentId",
    "tagId",
] as const);

export const IngredientTable = table(lamington.ingredient, [
    "ingredientId",
    "name",
    "description",
] as const);

export const ListTable = table(lamington.list, [
    "listId",
    "name",
    "customisations",
    "description",
] as const);

export const ListItemTable = table(lamington.listItem, [
    "itemId",
    "listId",
    "name",
    "completed",
    "ingredientId",
    "unit",
    "amount",
    "notes",
] as const);

const _ContentNoteTable = table(lamington.contentNote, [
    "contentId",
    "authorId",
    "title",
    "content",
    "public",
] as const);

export const PlannerMealTable = table(lamington.plannerMeal, [
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

export const PlannerTable = table(lamington.planner, [
    "plannerId",
    "name",
    "customisations",
    "description",
] as const);

export const RecipeTable = table(lamington.recipe, [
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

export const RecipeIngredientTable = table(lamington.recipeIngredient, [
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

export const RecipeRatingTable = table(lamington.recipeRating, [
    "recipeId",
    "raterId",
    "rating",
] as const);

const _RecipeSectionTable = table(lamington.recipeSection, [
    "recipeId",
    "sectionId",
    "index",
    "name",
    "description",
] as const);

export const RecipeStepTable = table(lamington.recipeStep, [
    "id",
    "recipeId",
    "sectionId",
    "index",
    "description",
] as const);

export const TagTable = table(lamington.tag, [
    "tagId",
    "name",
    "description",
    "parentId",
] as const);

export const UserTable = table(lamington.user, [
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

export const PAGE_SIZE = config.app.pageSize;
