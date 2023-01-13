export enum lamington {
    book = "book",
    bookMember = "book_member",
    bookRecipe = "book_recipe",
    ingredient = "ingredient",
    list = "list",
    listItem = "list_item",
    listMember = "list_member",
    recipe = "recipe",
    recipeIngredient = "recipe_ingredient",
    recipeRating = "recipe_rating",
    recipeRoster = "recipe_roster",
    recipeSection = "recipe_section",
    recipeStep = "recipe_step",
    recipeTag = "recipe_tag",
    tag = "tag",
    user = "user",
}

export type Table<T> = { [key in keyof T]: string };

export type ReadQuery<T> = T | Array<T>;

export type CreateQuery<T> = T | Array<T>;

export type ReadResponse<T> = Promise<Array<T>>;

export type CreateResponse<T> = Promise<Array<T>>;

export type DeleteResponse = Promise<number>;

export * from "./book";
export * from "./bookRecipe";
export * from "./bookMember";
export * from "./ingredient";
export * from "./list";
export * from "./listItem";
export * from "./listMember";
export * from "./recipe";
export * from "./recipeIngredient";
export * from "./recipeRating";
export * from "./recipeRoster";
export * from "./recipeSection";
export * from "./recipeStep";
export * from "./recipeTag";
export * from "./tag";
export * from "./user";
