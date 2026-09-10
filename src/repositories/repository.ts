/**
 * A function that wraps a callback in the current database context.
 * Implementations decide whether a real DB transaction is opened (services,
 * jobs) or just the store is populated (tests).
 */
export type TransactionRunner = <T>(fn: () => Promise<T>) => Promise<T>;

/**
 *   Map optional columns from the database (null) to undefined
 */
type NullToUndefined<T> = T extends object
    ? { [K in keyof T]: NullToUndefined<T[K]> }
    : null extends T
      ? NonNullable<T> | undefined
      : T;

/**
 * A single-request repository method signature. `null` database columns are
 * mapped to `undefined`.
 */
export type RepositoryMethod<Req, Res> = (
    request: Req,
) => Promise<NullToUndefined<Res>>;

export type RepositoryBulkMethod<Req, Res> = (
    request: ReadonlyArray<Req> | Req,
) => Promise<ReadonlyArray<NullToUndefined<Res>>>;
