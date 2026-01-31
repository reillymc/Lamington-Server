import type {
    Database,
    RepositoryBulkService,
    RepositoryService,
} from "./repository.ts";

export interface Tag {
    tagId: string;
    name: string;
    description: string | null;
    parentId: string | null;
}

type ReadRequest = undefined;
type ReadResponse = ReadonlyArray<Tag>;

type CreateRequest = {
    tagId: Tag["tagId"];
    name: Tag["name"];
    description?: Tag["description"];
    parentId?: Tag["parentId"];
};
type CreateResponse = Tag;

export interface TagRepository<TDatabase extends Database = Database> {
    readAll: RepositoryService<TDatabase, ReadRequest, ReadResponse>;
    create: RepositoryBulkService<TDatabase, CreateRequest, CreateResponse>;
}
