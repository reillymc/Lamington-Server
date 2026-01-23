import type { BaseRequest, BaseRequestParams, BaseResponse } from "./base.ts";

export const attachmentEndpoint = "/attachments" as const;
export const imageSubpath = "image" as const;
export const uploadDirectory = "uploads" as const;

/**
 * ImageAttachment
 */
export interface ImageAttachment {
    attachmentId: string;
    uri: string;
}

export interface AttachmentKey {
    attachmentId: string;
}

// Post image attachment
export type PostImageAttachmentRequestParams = BaseRequestParams;
export type PostImageAttachmentRequest =
    BaseRequest<PostImageAttachmentRequestParams>;
export type PostImageAttachmentResponse = BaseResponse<ImageAttachment>;
export type PostImageAttachmentService = (
    request: PostImageAttachmentRequest,
) => PostImageAttachmentResponse;

export interface AttachmentServices {
    postImage: PostImageAttachmentService;
    downloadImage: unknown;
}
