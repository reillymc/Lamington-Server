import type { RepositoryService } from "./repository.ts";

type DeleteRequest = {
    path: string;
};
type DeleteResponse = boolean;

type CreateRequest = {
    path: string;
    file: Buffer;
};
type CreateResponse = boolean;

export interface FileRepository {
    create: RepositoryService<undefined, CreateRequest, CreateResponse>;
    delete: RepositoryService<undefined, DeleteRequest, DeleteResponse>;
}
