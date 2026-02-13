import type { RepositoryService } from "./repository.ts";

type DeleteRequest = {
    path: string;
};
type DeleteResponse = boolean;

type CreateRequest = {
    file: Buffer;
    userId: string;
    attachmentId: string;
};
type CreateResponse = false | string;

export interface FileRepository {
    create: RepositoryService<undefined, CreateRequest, CreateResponse>;
    delete: RepositoryService<undefined, DeleteRequest, DeleteResponse>;
}
