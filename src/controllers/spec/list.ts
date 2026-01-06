import type { Content } from "../../database/definitions/content.ts";
import type { ContentMember } from "../../database/definitions/contentMember.ts";
import type { DeleteService, List, ReadMyService, ReadService, SaveService, User } from "../../database/index.ts";
import type { ContentMemberStatus } from "../content/contentMember.ts";

interface ListReadResponse
    extends Pick<List, "listId" | "name" | "customisations" | "description">,
        Pick<Content, "createdBy"> {
    createdByName: User["firstName"];
    status: ContentMemberStatus;
}

interface ListReadPermissionsResponse extends Pick<List, "listId">, Pick<Content, "createdBy"> {
    userId: User["userId"];
    status: ContentMemberStatus;
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
    Save: SaveService<
        List & {
            members?: Array<Pick<ContentMember, "userId"> & { status?: ContentMemberStatus }>;
            createdBy: Content["createdBy"];
        }
    >;

    /**
     * Get lists by id or ids
     * @security Insecure
     * @returns an array of lists matching given ids, but only with minimal required fields to ensure performance
     */
    ReadPermissions: ReadService<ListReadPermissionsResponse, "listId" | "userId">;
}
