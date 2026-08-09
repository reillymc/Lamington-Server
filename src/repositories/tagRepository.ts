import type { RepositoryBulkMethod, RepositoryMethod } from "./repository.ts";

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

export interface TagRepository {
    readAll: RepositoryMethod<ReadRequest, ReadResponse>;
    create: RepositoryBulkMethod<CreateRequest, CreateResponse>;
}
