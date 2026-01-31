import type { User } from "./userRepository.ts";

export type ContentMember = {
    contentId: string;
    userId: string;
    status: string;
};

export interface Content {
    contentId: string;
    createdBy: User["userId"];
    createdAt: string;
    updatedAt: string;
}

export interface ContentAttachment {
    contentId: string;
    attachmentId: string;
    displayType: string;
    displayId: string;
    displayOrder: number;
}

export interface ContentTag {
    contentId: string;
    tagId: string;
}
