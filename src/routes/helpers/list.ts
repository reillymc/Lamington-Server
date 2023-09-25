import { v4 as Uuid } from "uuid";

import { BisectOnValidItems, EnsureDefinedArray } from "../../utils";
import { List, ListItemIngredientAmount, PostListItemRequestBody, PostListRequestBody } from "../spec";
import { ListItemActions, ListMemberActions } from "../../controllers";
import { ServiceParams } from "../../database";
import { ListService } from "../../controllers/spec";

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
        console.log(item.amount);

        const validItem: ServiceParams<ListItemActions, "save"> = {
            itemId,
            listId,
            name,
            amount: stringifyAmount(item.amount),
            completed: item.completed ?? false,
            ingredientId: item.ingredientId,
            notes: item.notes,
            unit: item.unit,
            createdBy: userId,
        };

        return validItem;
    });
};

type ListResponse = Awaited<ReturnType<ListService["Read"]>>[number];
type ListItemsResponse = Awaited<ReturnType<ListItemActions["read"]>>;
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
    ...parseListCustomisations(list.customisations),
    createdBy: { userId: list.createdBy, firstName: list.createdByName },
    items: listItems
        ?.filter(item => item.listId === list.listId)
        .map(({ amount, ...item }) => ({ ...item, amount: parseAmount(amount) })),
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
