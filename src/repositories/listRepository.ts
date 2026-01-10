import type { Content } from "../database/definitions/content.ts";
import type { ContentMember } from "../database/definitions/contentMember.ts";
import type { List } from "../database/definitions/list.ts";
import type { ListItem } from "../database/definitions/listItem.ts";
import type { Database, User } from "../database/index.ts";
import type { RepositoryBulkService, RepositoryService } from "./repository.ts";

type ListUserStatus = "O" | "A" | "M" | "P" | "B";
type ListIcon = `variant${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17}`;

type VerifyPermissionsRequest = {
    userId: User["userId"];
    status: ListUserStatus | ReadonlyArray<ListUserStatus>;
    lists: ReadonlyArray<{
        listId: List["listId"];
    }>;
};

type VerifyPermissionsResponse = {
    userId: User["userId"];
    status: ListUserStatus | ReadonlyArray<ListUserStatus> | null;
    lists: ReadonlyArray<{
        listId: List["listId"];
        hasPermissions: boolean;
    }>;
};

type MemberSaveItem = {
    userId: ContentMember["userId"];
    status?: ListUserStatus;
};

type MemberResponseItem = {
    userId: ContentMember["userId"];
    firstName: User["firstName"];
    status: ListUserStatus | null;
};

type BaseListResponse = {
    listId: List["listId"];
    name: List["name"];
    description: List["description"];
    color: string | null;
    icon: ListIcon | null;
    owner: {
        userId: User["userId"];
        firstName: User["firstName"];
    };
    status: ListUserStatus | null;
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
    members: ReadonlyArray<
        MemberResponseItem & {
            lastName: User["lastName"];
        }
    >;
};

type SaveMembersRequest = {
    listId: List["listId"];
    members?: ReadonlyArray<MemberSaveItem>;
};

type SaveMembersResponse = {
    listId: List["listId"];
    members: ReadonlyArray<MemberResponseItem>;
};

type UpdateMembersRequest = {
    listId: List["listId"];
    members?: ReadonlyArray<MemberSaveItem>;
};

type UpdateMembersResponse = {
    listId: List["listId"];
    members: ReadonlyArray<MemberResponseItem>;
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
    listId: ListItem["listId"];
    name: ListItem["name"];
    completed: ListItem["completed"];
    updatedAt: Content["updatedAt"];
    ingredientId: ListItem["ingredientId"] | null;
    unit: ListItem["unit"] | null;
    amount: ListItem["amount"] | null;
    notes: ListItem["notes"] | null;
    owner: {
        userId: User["userId"];
        firstName: User["firstName"];
    };
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
    ingredientId?: ListItem["ingredientId"];
    unit?: ListItem["unit"];
    amount?: ListItem["amount"];
    notes?: ListItem["notes"];
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
    ingredientId?: ListItem["ingredientId"];
    unit?: ListItem["unit"];
    amount?: ListItem["amount"];
    notes?: ListItem["notes"];
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
    updatedAt?: Content["updatedAt"];
};

export interface ListRepository<TDatabase extends Database = Database> {
    countOutstandingItems: RepositoryBulkService<
        TDatabase,
        CountOutstandingItemsRequest,
        CountOutstandingItemsResponse
    >;
    create: RepositoryService<TDatabase, CreateListsRequest, CreateListsResponse>;
    createItems: RepositoryService<TDatabase, CreateItemsRequest, CreateItemsResponse>;
    delete: RepositoryService<TDatabase, DeleteListsRequest, DeleteListsResponse>;
    deleteItems: RepositoryService<TDatabase, DeleteItemsRequest, DeleteItemsResponse>;
    getLatestUpdatedTimestamp: RepositoryBulkService<
        TDatabase,
        GetLatestUpdatedTimestampRequest,
        GetLatestUpdatedTimestampResponse
    >;
    moveItems: RepositoryService<TDatabase, MoveItemsRequest, MoveItemsResponse>;
    read: RepositoryService<TDatabase, ReadListsRequest, ReadListsResponse>;
    readAll: RepositoryService<TDatabase, ReadAllListsRequest, ReadAllListsResponse>;
    readAllItems: RepositoryService<TDatabase, ReadAllItemsRequest, ReadAllItemsResponse>;
    readItems: RepositoryService<TDatabase, ReadItemsRequest, ReadItemsResponse>;
    readMembers: RepositoryBulkService<TDatabase, ReadMembersRequest, ReadMembersResponse>;
    removeMembers: RepositoryBulkService<TDatabase, RemoveMembersRequest, RemoveMembersResponse>;
    saveMembers: RepositoryBulkService<TDatabase, SaveMembersRequest, SaveMembersResponse>;
    update: RepositoryService<TDatabase, UpdateListsRequest, UpdateListsResponse>;
    updateItems: RepositoryService<TDatabase, UpdateItemsRequest, UpdateItemsResponse>;
    updateMembers: RepositoryBulkService<TDatabase, UpdateMembersRequest, UpdateMembersResponse>;
    verifyPermissions: RepositoryService<TDatabase, VerifyPermissionsRequest, VerifyPermissionsResponse>;
}
