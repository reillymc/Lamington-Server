import type { BaseRequest, BaseRequestBody, BaseRequestParams, BaseResponse, BaseSimpleRequestBody } from "./base.ts";
import type { EntityMember, EntityMembers, FractionValue, NumberValue, RangeValue } from "./common.ts";
import { type User, UserStatus } from "./user.ts";

export const listEndpoint = "/lists" as const;

export const itemSubpath = "items" as const;
export const listMemberSubpath = "members" as const;

export const listIdParam = "listId" as const;
export const itemIdParam = "itemId" as const;
export const listMemberIdParam = "userId" as const;

export type ListItemIngredientAmount = FractionValue | RangeValue | NumberValue;

/**
 * Lists
 */
export type Lists = {
    [listId: string]: List;
};

/**
 * List
 */
export type List = {
    listId: string;
    name: string;
    createdBy: Pick<User, "userId" | "firstName">;
    description: string | undefined;
    icon?: string;
    outstandingItemCount?: number;
    status?: UserStatus;
    items?: Array<ListItem>;
    members?: EntityMembers;
    lastUpdated?: string;
};

/**
 * ListItem
 */
export type ListItem = {
    itemId: string;
    name: string;
    updatedAt: string;
    completed: boolean;
    ingredientId?: string;
    unit?: string;
    amount?: ListItemIngredientAmount;
    notes?: string;
};

// Get lists
export type GetListsRequestParams = BaseRequestParams;
export type GetListsRequestBody = BaseRequestBody;

export type GetListsRequest = BaseRequest<GetListsRequestBody & GetListsRequestParams>;
export type GetListsResponse = BaseResponse<Lists>;
export type GetListsService = (request: GetListsRequest) => GetListsResponse;

// Get list
export type GetListRequestParams = BaseRequestParams<{ [listIdParam]: List["listId"] }>;
export type GetListRequestBody = BaseRequestBody;

export type GetListRequest = BaseRequest<GetListRequestParams & GetListRequestBody>;
export type GetListResponse = BaseResponse<List>;
export type GetListService = (request: GetListRequest) => GetListResponse;

// Post list
export type PostListRequestParams = BaseRequestParams;
export type PostListRequestBody = BaseRequestBody<{
    name?: List["name"];
    listId?: List["listId"];
    icon?: List["icon"];
    description?: List["description"];
    members?: Array<EntityMember>;
}>;

export type PostListRequest = BaseRequest<PostListRequestBody & PostListRequestParams>;
export type PostListResponse = BaseResponse;
export type PostListService = (request: PostListRequest) => PostListResponse;

// Post list item
export type PostListItemRequestParams = BaseRequestParams<{ [listIdParam]: List["listId"] }>;
export type PostListItemRequestBody = BaseRequestBody<{
    name: ListItem["name"];
    itemId: ListItem["itemId"];
    completed?: ListItem["completed"];
    ingredientId?: ListItem["ingredientId"];
    unit?: ListItem["unit"];
    amount?: ListItem["amount"];
    notes?: ListItem["notes"];
    createdBy: User["userId"];
    previousListId?: List["listId"];
}>;

export type PostListItemRequest = BaseRequest<PostListItemRequestParams & PostListItemRequestBody>;
export type PostListItemResponse = BaseResponse;
export type PostListItemService = (request: PostListItemRequest) => PostListItemResponse;

// Delete list
export type DeleteListRequestParams = BaseRequestParams<{ [listIdParam]: List["listId"] }>;
export type DeleteListRequestBody = BaseRequestBody;

export type DeleteListRequest = BaseRequest<DeleteListRequestParams & DeleteListRequestBody>;
export type DeleteListResponse = BaseResponse;
export type DeleteListService = (request: DeleteListRequest) => DeleteListResponse;

// Delete list item
export type DeleteListItemRequestParams = BaseRequestParams<{
    [listIdParam]: List["listId"];
    [itemIdParam]: ListItem["itemId"];
}>;
export type DeleteListItemRequestBody = BaseRequestBody;

export type DeleteListItemRequest = BaseRequest<DeleteListItemRequestParams & DeleteListItemRequestBody>;
export type DeleteListItemResponse = BaseResponse;
export type DeleteListItemService = (request: DeleteListItemRequest) => DeleteListItemResponse;

// Post list member
export type PostListMemberRequestParams = BaseRequestParams<{
    [listIdParam]: List["listId"];
}>;
export type PostListMemberRequestBody = BaseSimpleRequestBody;

export type PostListMemberRequest = BaseRequest<PostListMemberRequestParams & PostListMemberRequestBody>;
export type PostListMemberResponse = BaseResponse;
export type PostListMemberService = (request: PostListMemberRequest) => PostListMemberResponse;

// Delete list member
export type DeleteListMemberRequestParams = BaseRequestParams<{
    [listIdParam]: List["listId"];
    [listMemberIdParam]: User["userId"];
}>;
export type DeleteListMemberRequestBody = BaseRequestBody;

export type DeleteListMemberRequest = BaseRequest<DeleteListMemberRequestParams & DeleteListMemberRequestBody>;
export type DeleteListMemberResponse = BaseResponse;
export type DeleteListMemberService = (request: DeleteListMemberRequest) => DeleteListMemberResponse;

export interface ListServices {
    deleteList: DeleteListService;
    deleteListItem: DeleteListItemService;
    deleteListMember: DeleteListMemberService;
    getList: GetListService;
    getLists: GetListsService;
    postList: PostListService;
    postListItem: PostListItemService;
    postListMember: PostListMemberService;
}
