import { DeleteService, ListItem, ReadService, SaveService } from "../../database";

interface CountListItemsResponse {
    listId: string;
    count: number;
}

interface ReadMostRecentModifiedDateResponse {
    listId: string;
    updatedAt: string;
}

export interface ListItemService {
    /**
     * Deletes list items
     * @security Insecure: route authentication check required (user delete permission on lists)
     */
    Delete: DeleteService<ListItem, "listId" | "itemId">;

    /**
     * Get lists by id or ids
     * @security Insecure: route authentication check required (user read permission on lists)
     * @returns an array of listsItems matching given ids
     */
    Read: ReadService<ListItem, "listId">;

    /**
     * Creates or Saves a new list item from params
     * @security Insecure: route authentication check required (user save permission on lists)
     * @returns the newly created list items
     */
    Save: SaveService<Omit<ListItem, "updatedAt">>;

    /**
     * Get outstanding item count for list
     * @security Insecure
     * @returns an array of list ids with their given outstanding item count
     */
    CountOutstandingItems: ReadService<CountListItemsResponse, "listId">;

    /**
     * Read most recent modified timestamp for list by querying its items and returning the
     * timestamp of the most recently modified item
     * @security Insecure
     * @returns most recent modified timestamp for list
     */
    ReadLatestUpdatedTimestamp: ReadService<ReadMostRecentModifiedDateResponse, "listId">;
}
