import type { Tag } from "../database/definitions/tag.ts";
import type { Database } from "../database/index.ts";
import type { RepositoryBulkService, RepositoryService } from "./repository.ts";

type ReadRequest = undefined;
type ReadResponse = ReadonlyArray<Tag>;

type CreateRequest = Tag;
type CreateResponse = Tag;

export interface TagRepository<TDatabase extends Database = Database> {
    readAll: RepositoryService<TDatabase, ReadRequest, ReadResponse>;
    create: RepositoryBulkService<TDatabase, CreateRequest, CreateResponse>;
}
