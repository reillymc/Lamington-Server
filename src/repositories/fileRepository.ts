import type { RepositoryMethod } from "./repository.ts";

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
    create: RepositoryMethod<CreateRequest, CreateResponse>;
    delete: RepositoryMethod<DeleteRequest, DeleteResponse>;
}
