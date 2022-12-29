import { BaseRequest, BaseRequestBody, BaseRequestParams, BaseResponse } from ".";

export const attachmentEndpoint = "/attachments" as const;
export const imageSubpath = "image" as const;

/**
 * ImageAttachment
 */
export interface ImageAttachment {
    address: string;
}

// Post image attachment
export type PostImageAttachmentRequestParams = BaseRequestParams;
export type PostImageAttachmentRequestBody = BaseRequestBody;

export type PostImageAttachmentRequest = BaseRequest<PostImageAttachmentRequestBody & PostImageAttachmentRequestParams>;
export type PostImageAttachmentResponse = BaseResponse<ImageAttachment>;
export type PostImageAttachmentService = (request: PostImageAttachmentRequest) => PostImageAttachmentResponse;

export interface AttachmentServices {
    postImage: PostImageAttachmentService;
}
