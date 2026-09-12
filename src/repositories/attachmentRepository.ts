import type { Database, RepositoryService } from "./repository.ts";
import type { User } from "./userRepository.ts";

export interface Attachment {
    attachmentId: string;
    uri: string;
    preview: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

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
        preview?: Attachment["preview"];
    }>;
};

type UpdateResponse = {
    userId: User["userId"];
    attachments: ReadonlyArray<Attachment>;
};

type VerifyPermissionsRequest = {
    userId: User["userId"];
    attachments: ReadonlyArray<{
        attachmentId: Attachment["attachmentId"];
    }>;
};

type VerifyPermissionsResponse = {
    userId: User["userId"];
    attachments: ReadonlyArray<{
        attachmentId: Attachment["attachmentId"];
        hasPermissions: boolean;
    }>;
};

export interface AttachmentRepository<TDatabase extends Database = Database> {
    create: RepositoryService<TDatabase, CreateRequest, CreateResponse>;
    update: RepositoryService<TDatabase, UpdateRequest, UpdateResponse>;
    verifyPermissions: RepositoryService<
        TDatabase,
        VerifyPermissionsRequest,
        VerifyPermissionsResponse
    >;
}
