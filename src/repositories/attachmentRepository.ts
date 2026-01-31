import type { Attachment } from "../database/definitions/attachment.ts";
import type { Database, User } from "../database/index.ts";
import type { RepositoryService } from "./repository.ts";

type CreateRequest = {
    userId: User["userId"];
    attachments: ReadonlyArray<{
        uri: Attachment["uri"];
    }>;
};

type CreateResponse = {
    userId: User["userId"];
    attachments: ReadonlyArray<Attachment>;
};

type UpdateRequest = {
    userId: User["userId"];
    attachments: ReadonlyArray<{
        attachmentId: Attachment["attachmentId"];
        uri: Attachment["uri"];
    }>;
};

type UpdateResponse = {
    userId: User["userId"];
    attachments: ReadonlyArray<Attachment>;
};

export interface AttachmentRepository<TDatabase extends Database = Database> {
    create: RepositoryService<TDatabase, CreateRequest, CreateResponse>;
    update: RepositoryService<TDatabase, UpdateRequest, UpdateResponse>;
}
