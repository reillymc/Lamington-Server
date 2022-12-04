export enum lamington {
    book = "book",
    bookMeal = "book_meal",
    category = "category",
    ingredient = "ingredient",
    list = "list",
    listItem = "list_item",
    listMember = "list_member",
    meal = "meal",
    mealCategory = "meal_category",
    mealIngredient = "meal_ingredient",
    mealRating = "meal_rating",
    mealRoster = "meal_roster",
    mealSection = "meal_section",
    mealStep = "meal_step",
    user = "user",
}

export type Table<T> = { [key in keyof T]: string };

export type ReadQuery<T> = T | Array<T>;

export type CreateQuery<T> = T | Array<T>;

export type ReadResponse<T> = Promise<Array<T>>;

export type CreateResponse<T> = Promise<Array<T>>;

export type DeleteResponse = Promise<number>;

export * from "./book";
export * from "./bookMeal";
export * from "./category";
export * from "./ingredient";
export * from "./list";
export * from "./listItem";
export * from "./listMember";
export * from "./meal";
export * from "./mealCategory";
export * from "./mealIngredient";
export * from "./mealRating";
export * from "./mealRoster";
export * from "./mealSection";
export * from "./mealStep";
export * from "./user";
