import type {
    DeleteService,
    List,
    ListMember,
    ReadMyService,
    ReadService,
    SaveService,
    User,
} from "../../database/index.ts";
import type { EntityMember } from "../entity/index.ts";

interface ListReadResponse extends Pick<List, "listId" | "name" | "customisations" | "createdBy" | "description"> {
    createdByName: User["firstName"];
    status: ListMember["status"];
}

interface ListReadPermissionsResponse extends Pick<List, "listId" | "createdBy"> {
    userId: User["userId"];
    status: ListMember["status"];
}

export interface ListService {
    /**
     * Deletes lists by list ids
     * @security Insecure: route authentication check required (user delete permission on lists)
     */
    Delete: DeleteService<List, "listId">;

    /**
     * Get lists by id or ids
     * @security Secure: no authentication checks required
     * @returns an array of lists matching given ids
     */
    Read: ReadService<ListReadResponse, "listId", Pick<User, "userId">>;

    /**
     * Get users lists. Includes lists created by the user and lists the user is a member of.
     * @security Secure: no authentication checks required.
     * @returns an array of lists.
     */
    ReadByUser: ReadMyService<ListReadResponse>;

    /**
     * Creates or Saves a new list from params
     * @security Insecure: route authentication check required (user save permission on lists)
     * @returns the newly created lists
     */
    Save: SaveService<List & { members?: Array<EntityMember> }>;

    /**
     * Get lists by id or ids
     * @security Insecure
     * @returns an array of lists matching given ids, but only with minimal required fields to ensure performance
     */
    ReadPermissions: ReadService<ListReadPermissionsResponse, "listId" | "userId">;
}
