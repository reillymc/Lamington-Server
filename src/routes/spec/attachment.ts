import { BaseRequest, BaseRequestParams, BaseResponse } from ".";

export const attachmentEndpoint = "/attachments" as const;
export const imageSubpath = "image" as const;
export const uploadDirectory = "uploads" as const;

/**
 * ImageAttachment
 */
export interface ImageAttachment {
    address: string;
}

// Post image attachment
export type PostImageAttachmentRequestParams = BaseRequestParams;
export type PostImageAttachmentRequestBody = { entity: string };

export type PostImageAttachmentRequest = BaseRequest<PostImageAttachmentRequestBody & PostImageAttachmentRequestParams>;
export type PostImageAttachmentResponse = BaseResponse<ImageAttachment>;
export type PostImageAttachmentService = (request: PostImageAttachmentRequest) => PostImageAttachmentResponse;

export interface AttachmentServices {
    postImage: PostImageAttachmentService;
    downloadImage: unknown;
}
