import type {
    BaseRequest,
    BaseRequestBody,
    BaseRequestParams,
    BaseResponse,
} from "./base.ts";

export const tagEndpoint = "/tags" as const;

/**
 * TagGroups
 */
export interface TagGroups {
    [tagId: string]: TagGroup;
}

/**
 * TagGroup
 */
export interface TagGroup extends Tag {
    tags?: Tags;
}

/**
 * Tags
 */
export interface Tags {
    [tagId: string]: Tag;
}

/**
 * Tag
 */
export interface Tag {
    tagId: string;
    name: string;
    description?: string;
}

// Get tags
export type GetTagsRequestParams = BaseRequestParams;
export type GetTagsRequestBody = BaseRequestBody;

export type GetTagsRequest = BaseRequest<
    GetTagsRequestBody & GetTagsRequestParams
>;
export type GetTagsResponse = BaseResponse<TagGroups>;
export type GetTagsService = (request: GetTagsRequest) => GetTagsResponse;

export interface TagServices {
    getTags: GetTagsService;
}

export const PresetTagGroups = {
    Cuisine: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
    Meal: "7a2dc44b-1eac-4810-8a1c-322cb14ce5c8",
    Difficulty: "5508c6d9-49c7-462e-9e45-f6e6c78abe6c",
    Dietary: "038e3305-b679-4822-bc57-6e6fda8eb766",
    Cost: "e6167e53-7115-475d-ade0-6261e486f4ce",
} as const;
