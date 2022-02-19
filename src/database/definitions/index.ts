export * from "./category";
export * from "./ingredient";
export * from "./meal";
export * from "./mealCategory";
export * from "./mealIngredient";
export * from "./mealRating";
export * from "./mealStep";

export { lamington, mealRoster, users } from "./lamington";

export type ReadQuery<T> = T | Array<T>;

export type CreateQuery<T> = T | Array<T>;

export type ReadResponse<T> = Promise<Array<T>>;

export type CreateResponse<T> = Promise<Array<T>>;
