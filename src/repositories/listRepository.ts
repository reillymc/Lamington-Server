import type { RepositoryBulkMethod, RepositoryMethod } from "./repository.ts";
import type { Content, ContentMember } from "./temp.ts";
import type { MemberResponseItem, Owner } from "./types.ts";
import type { User } from "./userRepository.ts";

export type ListUserStatus = "O" | "A" | "M" | "P" | "B";
export type ListIcon =
    `variant${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17}`;

type NumberValue = { representation: "number"; value: string };
type RangeValue = { representation: "range"; value: [string, string] };
type FractionValue = {
    representation: "fraction";
    value: [string, string, string];
};

type ListItemIngredientAmountV1 = RangeValue | NumberValue | FractionValue;

type ListItemIngredientAmount = ListItemIngredientAmountV1;

type ListCustomisationsV1 = {
    icon: string;
};

type ListCustomisations = ListCustomisationsV1;

/**
 * List
 */
export type List = {
    listId: string;
    name: string;
    customisations: ListCustomisations | undefined;
    description: string | undefined;
};

/**
 * ListItem
 */
export interface ListItem {
    itemId: string;
    listId: string;
    name: string;
    completed: boolean;
    ingredientId: string | undefined;
    unit: string | undefined;
    amount: ListItemIngredientAmount | undefined;
    notes: string | undefined;
}

type VerifyPermissionsRequest = {
    userId: User["userId"];
    status: ListUserStatus | [ListUserStatus, ...ReadonlyArray<ListUserStatus>];
    lists: ReadonlyArray<{
        listId: List["listId"];
    }>;
};

type VerifyPermissionsResponse = {
    userId: User["userId"];
    status: ListUserStatus | ReadonlyArray<ListUserStatus> | undefined;
    lists: ReadonlyArray<{
        listId: List["listId"];
        hasPermissions: boolean;
    }>;
};

type MemberSaveItem = {
    userId: ContentMember["userId"];
    status?: ListUserStatus;
};

type BaseListResponse = {
    listId: List["listId"];
    name: List["name"];
    description: List["description"];
    icon: ListIcon | undefined;
    owner: Owner;
    status: ListUserStatus | undefined;
};

type ReadAllListsRequest = {
    userId: User["userId"];
    filter?: {
        owner?: Content["createdBy"];
    };
};

type ReadAllListsResponse = {
    userId: User["userId"];
    lists: ReadonlyArray<BaseListResponse>;
};

type ReadListsRequest = {
    userId: User["userId"];
    lists: ReadonlyArray<{
        listId: List["listId"];
    }>;
};

type ReadListsResponse = {
    userId: User["userId"];
    lists: ReadonlyArray<BaseListResponse>;
};

type CreateListsRequest = {
    userId: User["userId"];
    lists: ReadonlyArray<{
        name: List["name"];
        description?: List["description"];
        color?: string;
        icon?: ListIcon;
    }>;
};

type CreateListsResponse = ReadListsResponse;

type UpdateListsRequest = {
    userId: User["userId"];
    lists: ReadonlyArray<{
        listId: List["listId"];
        name?: List["name"];
        description?: List["description"] | null;
        color?: string;
        icon?: ListIcon;
    }>;
};

type UpdateListsResponse = ReadListsResponse;

type DeleteListsRequest = {
    lists: ReadonlyArray<{
        listId: List["listId"];
    }>;
};

type DeleteListsResponse = {
    count: number;
};

type ReadMembersRequest = {
    listId: List["listId"];
};

type ReadMembersResponse = {
    listId: List["listId"];
    members: ReadonlyArray<MemberResponseItem<ListUserStatus>>;
};

type SaveMembersRequest = {
    listId: List["listId"];
    members: ReadonlyArray<MemberSaveItem>;
};

type SaveMembersResponse = {
    listId: List["listId"];
    members: ReadonlyArray<MemberResponseItem<ListUserStatus>>;
};

type RemoveMembersRequest = {
    listId: List["listId"];
    members: ReadonlyArray<{
        userId: ContentMember["userId"];
    }>;
};

type RemoveMembersResponse = {
    listId: List["listId"];
    count: number;
};

type ListItemResponse = {
    itemId: ListItem["itemId"];
    name: ListItem["name"];
    completed: ListItem["completed"];
    updatedAt: Content["updatedAt"];
    ingredientId: ListItem["ingredientId"];
    unit: ListItem["unit"];
    amount: ListItem["amount"];
    notes: ListItem["notes"];
};

type ReadAllItemsRequest = {
    userId: User["userId"];
    filter: {
        listId: List["listId"];
    };
};

type ReadAllItemsResponse = {
    items: ReadonlyArray<ListItemResponse>;
};

type ReadItemsRequest = {
    userId: User["userId"];
    listId: List["listId"];
    items: ReadonlyArray<{
        itemId: ListItem["itemId"];
    }>;
};

type ReadItemsResponse = {
    listId: List["listId"];
    items: ReadonlyArray<ListItemResponse>;
};

type CreateListItemPayload = {
    name: ListItem["name"];
    completed?: ListItem["completed"];
    ingredientId?: ListItem["ingredientId"] | null;
    unit?: ListItem["unit"] | null;
    amount?: ListItem["amount"] | null;
    notes?: ListItem["notes"] | null;
};

type CreateItemsRequest = {
    userId: User["userId"];
    listId: List["listId"];
    items: ReadonlyArray<CreateListItemPayload>;
};

type CreateItemsResponse = {
    listId: List["listId"];
    items: ReadonlyArray<ListItemResponse>;
};

type UpdateListItemPayload = {
    itemId: ListItem["itemId"];
    name?: ListItem["name"];
    completed?: ListItem["completed"];
    ingredientId?: ListItem["ingredientId"] | null;
    unit?: ListItem["unit"] | null;
    amount?: ListItem["amount"] | null;
    notes?: ListItem["notes"] | null;
};

type UpdateItemsRequest = {
    listId: List["listId"];
    userId: User["userId"];
    items: ReadonlyArray<UpdateListItemPayload>;
};

type UpdateItemsResponse = {
    listId: List["listId"];
    items: ReadonlyArray<ListItemResponse>;
};

type MoveItemsRequest = {
    userId: User["userId"];
    listId: ListItem["listId"];
    items: ReadonlyArray<{
        itemId: ListItem["itemId"];
    }>;
};

type MoveItemsResponse = {
    listId: List["listId"];
    items: ReadonlyArray<ListItemResponse>;
};

type DeleteItemsRequest = {
    listId: List["listId"];
    items: ReadonlyArray<{
        itemId: ListItem["itemId"];
    }>;
};

type DeleteItemsResponse = {
    listId: List["listId"];
    count: number;
};

type CountOutstandingItemsRequest = {
    listId: List["listId"];
};

type CountOutstandingItemsResponse = {
    listId: List["listId"];
    count: number;
};

type GetLatestUpdatedTimestampRequest = {
    listId: List["listId"];
};

type GetLatestUpdatedTimestampResponse = {
    listId: List["listId"];
    updatedAt: Content["updatedAt"] | undefined;
};

export interface ListRepository {
    countOutstandingItems: RepositoryBulkMethod<
        CountOutstandingItemsRequest,
        CountOutstandingItemsResponse
    >;
    create: RepositoryMethod<CreateListsRequest, CreateListsResponse>;
    createItems: RepositoryMethod<CreateItemsRequest, CreateItemsResponse>;
    delete: RepositoryMethod<DeleteListsRequest, DeleteListsResponse>;
    deleteItems: RepositoryMethod<DeleteItemsRequest, DeleteItemsResponse>;
    getLatestUpdatedTimestamp: RepositoryBulkMethod<
        GetLatestUpdatedTimestampRequest,
        GetLatestUpdatedTimestampResponse
    >;
    moveItems: RepositoryMethod<MoveItemsRequest, MoveItemsResponse>;
    read: RepositoryMethod<ReadListsRequest, ReadListsResponse>;
    readAll: RepositoryMethod<ReadAllListsRequest, ReadAllListsResponse>;
    readAllItems: RepositoryMethod<ReadAllItemsRequest, ReadAllItemsResponse>;
    readItems: RepositoryMethod<ReadItemsRequest, ReadItemsResponse>;
    readMembers: RepositoryBulkMethod<ReadMembersRequest, ReadMembersResponse>;
    removeMembers: RepositoryBulkMethod<
        RemoveMembersRequest,
        RemoveMembersResponse
    >;
    saveMembers: RepositoryBulkMethod<SaveMembersRequest, SaveMembersResponse>;
    update: RepositoryMethod<UpdateListsRequest, UpdateListsResponse>;
    updateItems: RepositoryMethod<UpdateItemsRequest, UpdateItemsResponse>;
    verifyPermissions: RepositoryMethod<
        VerifyPermissionsRequest,
        VerifyPermissionsResponse
    >;
}
