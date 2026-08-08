export interface Database {
    transaction<T>(
        transactionScope: (trx: this) => Promise<T> | undefined,
    ): Promise<T>;
}

/**
 *   Map optional columns from the database (null) to undefined
 */
type NullToUndefined<T> = T extends object
    ? { [K in keyof T]: NullToUndefined<T[K]> }
    : null extends T
      ? NonNullable<T> | undefined
      : T;

/**
 *   A repository action bound to a database.
 *
 *   The method is declared with the `bivarianceHack` so that `Db` is checked
 *   bivariantly, allowing a repository bound to a concrete database type
 *   (e.g. `KnexDatabase`) to be assigned to the same repository typed against
 *   the generic `Database`.
 */
export type RepositoryService<Db, Req, Res> = {
    bivarianceHack(db: Db, request: Req): Promise<NullToUndefined<Res>>;
}["bivarianceHack"];

/**
 *   A bulk repository action bound to a database, accepting either a single
 *   request or an array of requests.
 */
export type RepositoryBulkService<Db, Req, Res> = {
    bivarianceHack(
        db: Db,
        request: ReadonlyArray<Req> | Req,
    ): Promise<ReadonlyArray<NullToUndefined<Res>>>;
}["bivarianceHack"];
