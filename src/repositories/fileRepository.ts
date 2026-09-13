import type { RepositoryBulkService } from "./repository.ts";

export type CreateRequest = {
    attachmentId: string;
    file: Buffer;
};
export type CreateResponse = {
    attachmentId: string;
} & ({ succeeded: true } | { succeeded: false });

export type DeleteRequest = {
    attachmentId: string;
};
export type DeleteResponse = {
    attachmentId: string;
    succeeded: boolean;
};

export interface FileRepository {
    create: RepositoryBulkService<undefined, CreateRequest, CreateResponse>;
    delete: RepositoryBulkService<undefined, DeleteRequest, DeleteResponse>;
}
