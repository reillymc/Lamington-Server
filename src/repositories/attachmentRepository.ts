import type { Database, RepositoryService } from "./repository.ts";
import type { User } from "./userRepository.ts";

export interface Attachment {
    attachmentId: string;
    preview: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

type CreateRequest = {
    userId: User["userId"];
    attachments: ReadonlyArray<{
        preview?: Attachment["preview"];
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

type ReadPurgeableAttachmentsRequest = {
    limit: number;
    createdBefore: Date;
};

type ReadPurgeableAttachmentsResponse = {
    attachments: ReadonlyArray<{
        attachmentId: Attachment["attachmentId"];
    }>;
};

type DeletePurgeableAttachmentsRequest = {
    attachments: ReadonlyArray<{
        attachmentId: Attachment["attachmentId"];
    }>;
};

type DeletePurgeableAttachmentsResponse = {
    count: number;
};

type ReadAttachmentsForUsersRequest = {
    users: ReadonlyArray<{
        userId: User["userId"];
    }>;
};

type ReadAttachmentsForUsersResponse = {
    attachments: ReadonlyArray<{
        attachmentId: Attachment["attachmentId"];
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
    readPurgeable: RepositoryService<
        TDatabase,
        ReadPurgeableAttachmentsRequest,
        ReadPurgeableAttachmentsResponse
    >;
    deletePurgeable: RepositoryService<
        TDatabase,
        DeletePurgeableAttachmentsRequest,
        DeletePurgeableAttachmentsResponse
    >;
    readAllForUsers: RepositoryService<
        TDatabase,
        ReadAttachmentsForUsersRequest,
        ReadAttachmentsForUsersResponse
    >;
}
