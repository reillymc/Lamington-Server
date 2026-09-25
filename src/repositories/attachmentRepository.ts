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

type ClaimPurgeableAttachmentsRequest = {
    limit: number;
    createdBefore: Date;
};

type ClaimPurgeableAttachmentsResponse = {
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
    verifyPermissions: RepositoryService<
        TDatabase,
        VerifyPermissionsRequest,
        VerifyPermissionsResponse
    >;
    claimPurgeable: RepositoryService<
        TDatabase,
        ClaimPurgeableAttachmentsRequest,
        ClaimPurgeableAttachmentsResponse
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
