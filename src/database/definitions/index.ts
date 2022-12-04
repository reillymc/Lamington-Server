export * from "./category";
export * from "./ingredient";
export * from "./meal";
export * from "./mealCategory";
export * from "./mealIngredient";
export * from "./mealRating";
export * from "./mealStep";
export * from "./list";
export * from "./listItem";
export * from "./listMember";
export * from "./user";
export * from "./mealSection";

export type Table<T> = { [key in keyof T]: string };

export enum lamington {
    user = "user",
    meal = "meal",
    mealRating = "meal_rating",
    mealCategory = "meal_category",
    mealRoster = "meal_roster",
    mealIngredient = "meal_ingredient",
    mealStep = "meal_step",
    mealSection = "meal_section",
    category = "category",
    ingredient = "ingredient",
    list = "list",
    listItem = "list_item",
    listMember = "list_member",
}

export type ReadQuery<T> = T | Array<T>;

export type CreateQuery<T> = T | Array<T>;

export type ReadResponse<T> = Promise<Array<T>>;

export type CreateResponse<T> = Promise<Array<T>>;

export type DeleteResponse = Promise<number>;
