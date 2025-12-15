export type RepositoryService<Db, Req, Res> = (db: Db, request: Req) => Promise<Res>;
export type RepositoryBulkService<Db, Req, Res> = (db: Db, request: Array<Req> | Req) => Promise<Array<Res>>;
