import type { RepositoryBulkService, RepositoryService } from "./repository.ts";

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

export type ReadRequest = {
    attachmentId: string;
};

export type ReadResponse =
    | {
          attachmentId: string;
          type: "file";
          path: string;
      }
    | {
          attachmentId: string;
          type: "redirect";
          url: string;
      };

export interface FileRepository {
    create: RepositoryBulkService<undefined, CreateRequest, CreateResponse>;
    read: RepositoryService<undefined, ReadRequest, ReadResponse>;
    delete: RepositoryBulkService<undefined, DeleteRequest, DeleteResponse>;
}
