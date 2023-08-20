import { v4 as Uuid } from "uuid";

import { BisectOnValidItems, EnsureDefinedArray } from "../../utils";
import { List, PostListItemRequestBody, PostListRequestBody } from "../spec";
import { ListActions, ListItemActions, ListMemberActions } from "../../controllers";
import { ServiceParams } from "../../database";

export const validatePostListBody = ({ data }: PostListRequestBody, userId: string) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ listId = Uuid(), name, ...item }) => {
        if (!name) return;

        const validItem: ServiceParams<ListActions, "save"> = {
            listId,
            name,
            description: item.description,
            customisations: stringifyListCustomisations({ icon: item.icon }),
            members: item.members,
            createdBy: userId,
        };

        return validItem;
    });
};

export const validatePostListItemBody = ({ data }: PostListItemRequestBody, userId: string, listId: string) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ itemId = Uuid(), name, ...item }) => {
        if (!name) return;

        const parsedDate = item.dateAdded ? new Date(item.dateAdded) : new Date();

        const validItem: ServiceParams<ListItemActions, "save"> = {
            itemId,
            listId,
            name,
            amount: item.amount,
            completed: item.completed ?? false,
            dateAdded: parsedDate.toISOString().slice(0, 19).replace("T", " "),
            ingredientId: item.ingredientId,
            notes: item.notes,
            unit: item.unit,
            createdBy: userId,
        };

        return validItem;
    });
};

type ListResponse = Awaited<ReturnType<ListActions["read"]>>[number];
type ListItemsResponse = Awaited<ReturnType<ListItemActions["read"]>>;
type MembersResponse = Awaited<ReturnType<ListMemberActions["read"]>>;

export const prepareGetListResponseBody = (
    list: ListResponse,
    userId: string,
    outstandingItemCount?: number,
    listItems?: ListItemsResponse,
    members?: MembersResponse
): List => ({
    listId: list.listId,
    name: list.name,
    description: list.description,
    ...parseListCustomisations(list.customisations),
    outstandingItemCount,
    createdBy: { userId: list.createdBy, firstName: list.createdByName },
    items: listItems ? listItems.filter(item => item.listId === list.listId) : undefined,
    members: members
        ? Object.fromEntries(
              members.map(({ userId, canEdit, firstName, lastName }) => [
                  userId,
                  { userId, allowEditing: !!canEdit, firstName, lastName },
              ])
          )
        : undefined,
    accepted: list.createdBy === userId ? true : !!list.accepted,
    canEdit: list.createdBy === userId ? true : !!list.canEdit,
});

type ListCustomisationsV1 = Pick<List, "icon">;
export type ListCustomisations = ListCustomisationsV1;
const DefaultListIcon = "variant1";

export const parseListCustomisations = (customisations?: string): ListCustomisations => {
    const parsed = JSON.parse(customisations ?? "{}") as Partial<ListCustomisationsV1>;

    return { icon: parsed.icon ?? DefaultListIcon };
};

export const stringifyListCustomisations = (customisations: Partial<ListCustomisations>): string => {
    const { icon = DefaultListIcon } = customisations;

    return JSON.stringify({ icon });
};
