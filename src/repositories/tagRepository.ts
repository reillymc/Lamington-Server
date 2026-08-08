import type {
    Database,
    RepositoryBulkService,
    RepositoryService,
} from "./repository.ts";

export interface Tag {
    tagId: string;
    name: string;
    description: string | undefined;
    parentId: string | undefined;
}

type ReadRequest = undefined;
type ReadResponse = ReadonlyArray<Tag>;

type CreateRequest = {
    name: Tag["name"];
    description?: Tag["description"] | null;
    parentId?: Tag["parentId"] | null;
};
type CreateResponse = Tag;

export interface TagRepository<TDatabase extends Database = Database> {
    readAll: RepositoryService<TDatabase, ReadRequest, ReadResponse>;
    create: RepositoryBulkService<TDatabase, CreateRequest, CreateResponse>;
}
