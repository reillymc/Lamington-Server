// Map optional columns from the database (null) to undefined
type NullToUndefined<T> = T extends object
    ? { [K in keyof T]: NullToUndefined<T[K]> }
    : null extends T
      ? NonNullable<T> | undefined
      : T;

export type RepositoryService<Db, Req, Res> = (
    db: Db,
    request: Req,
) => Promise<NullToUndefined<Res>>;
export type RepositoryBulkService<Db, Req, Res> = (
    db: Db,
    request: ReadonlyArray<Req> | Req,
) => Promise<ReadonlyArray<NullToUndefined<Res>>>;
