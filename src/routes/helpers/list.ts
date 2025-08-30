import { v4 as Uuid } from "uuid";

import { ListActions, ListMemberActions } from "../../controllers/index.ts";
import type { ListItemService, ListService } from "../../controllers/spec/index.ts";
import type { ServiceParams } from "../../database/index.ts";
import { BisectOnValidItems, EnsureArray, EnsureDefinedArray } from "../../utils/index.ts";
import {
    type List,
    type ListItemIngredientAmount,
    type PostListItemRequestBody,
    type PostListRequestBody,
    UserStatus,
} from "../spec/index.ts";
import { validatePermissions } from "./permissions.ts";
import { getStatus } from "./user.ts";

const parseAmount = (amountJSON: string | undefined) => {
    if (!amountJSON) return;

    try {
        const amount = JSON.parse(amountJSON) as ListItemIngredientAmount;

        if (!["number", "fraction", "range"].includes(amount.representation)) return;

        return amount;
    } catch {
        return;
    }
};

const stringifyAmount = (amount: ListItemIngredientAmount | undefined) => {
    if (!amount) return;

    switch (amount.representation) {
        case "number":
            if (typeof amount.value === "string") return JSON.stringify(amount);
        case "fraction":
            if (
                Array.isArray(amount.value) &&
                amount.value.length === 3 &&
                amount.value.every(v => typeof v === "string")
            )
                return JSON.stringify(amount);
        case "range":
            if (
                Array.isArray(amount.value) &&
                amount.value.length === 2 &&
                amount.value.every(v => typeof v === "string")
            )
                return JSON.stringify(amount);
    }
};

export const validatePostListBody = ({ data }: PostListRequestBody, userId: string) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ listId = Uuid(), name, ...item }) => {
        if (!name) return;

        const validItem: ServiceParams<ListService, "Save"> = {
            listId,
            name,
            description: item.description,
            customisations: { icon: item.icon },
            members: item.members,
            createdBy: userId,
        };

        return validItem;
    });
};

export const validatePostListItemBody = ({ data }: PostListItemRequestBody, userId: string, listId: string) => {
    const filteredData = EnsureDefinedArray(data);
    let movedItems: Array<ServiceParams<ListItemService, "Delete">> = [];

    const [validListItems, invalidListItems] = BisectOnValidItems(
        filteredData,
        ({ itemId = Uuid(), name, ...item }) => {
            if (!name) return;

            const validItem: ServiceParams<ListItemService, "Save"> = {
                itemId,
                listId,
                name,
                amount: item.amount,
                completed: item.completed ?? false,
                ingredientId: item.ingredientId,
                notes: item.notes,
                unit: item.unit,
                createdBy: userId,
            };

            if (item.previousListId) {
                movedItems.push({ listId: item.previousListId, itemId });
            }

            return validItem;
        }
    );

    return {
        validListItems,
        invalidListItems,
        movedItems,
    };
};

type ListResponse = Awaited<ReturnType<ListService["Read"]>>[number];
type ListItemsResponse = Awaited<ReturnType<ListItemService["Read"]>>;
type MembersResponse = Awaited<ReturnType<ListMemberActions["read"]>>;

interface PrepareGetListResponseBodyParams {
    list: ListResponse;
    userId: string;
    outstandingItemCount?: number;
    listItems?: ListItemsResponse;
    members?: MembersResponse;
    lastUpdated?: string;
}

export const prepareGetListResponseBody = ({
    list,
    userId,
    listItems,
    members,
    outstandingItemCount,
    lastUpdated,
}: PrepareGetListResponseBodyParams): List => ({
    listId: list.listId,
    name: list.name,
    description: list.description,
    outstandingItemCount,
    lastUpdated,
    ...list.customisations,
    createdBy: { userId: list.createdBy, firstName: list.createdByName },
    items: listItems?.filter(item => item.listId === list.listId),
    members: members
        ? Object.fromEntries(
              members.map(({ userId, status, firstName, lastName }) => [
                  userId,
                  { userId, status: getStatus(status), firstName, lastName },
              ])
          )
        : undefined,
    status: getStatus(list.status, list.createdBy === userId),
});

type ListCustomisationsV1 = Pick<List, "icon">;
export type ListCustomisations = ListCustomisationsV1;
const DefaultListIcon = "variant1";

export const parseListCustomisations = (customisations?: string): ListCustomisations => {
    try {
        const parsed = JSON.parse(customisations ?? "{}") as Partial<ListCustomisationsV1>;

        return { icon: parsed.icon ?? DefaultListIcon };
    } catch {
        return { icon: DefaultListIcon };
    }
};

export const stringifyListCustomisations = (customisations: Partial<ListCustomisations>): string => {
    const { icon = DefaultListIcon } = customisations;

    return JSON.stringify({ icon });
};

interface ValidatedPermissions {
    permissionsValid: boolean;
    missingLists: string[];
}

export const validateListPermissions = async (
    listIds: string | string[],
    userId: string,
    permissionLevel: Exclude<UserStatus, typeof UserStatus.Blacklisted>
): Promise<ValidatedPermissions> => {
    const listIdsArray = EnsureArray(listIds);

    const existingLists = await ListActions.ReadPermissions([
        ...EnsureArray(listIdsArray).map(listId => ({ listId, userId })),
    ]);

    const statuses = existingLists.map(list => getStatus(list.status, list.createdBy === userId));
    const missingLists = listIdsArray.filter(listId => !existingLists.some(list => list.listId === listId));

    return { missingLists, permissionsValid: validatePermissions(statuses, permissionLevel) };
};
