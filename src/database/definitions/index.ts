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

export { lamington, mealRoster } from "./lamington";

export type ReadQuery<T> = T | Array<T>;

export type CreateQuery<T> = T | Array<T>;

export type ReadResponse<T> = Promise<Array<T>>;

export type CreateResponse<T> = Promise<Array<T>>;

// export type Read<T, R> = T extends Array<T> ? (params: Array<T>) => Promise<Array<R>> : (params: T) => Promise<R>;