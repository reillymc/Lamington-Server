import type { Content } from "../../database/definitions/content.ts";
import type { ContentMember } from "../../database/definitions/contentMember.ts";
import type { DeleteService, Planner, ReadMyService, ReadService, SaveService, User } from "../../database/index.ts";
import type { UserStatus } from "../../routes/spec/user.ts";

interface PlannerReadResponse
    extends Pick<Planner, "plannerId" | "name" | "customisations" | "description">,
        Pick<Content, "createdBy"> {
    createdByName: User["firstName"];
    status: ContentMember["status"];
}

interface PlannerReadPermissionsResponse extends Pick<Planner, "plannerId">, Pick<Content, "createdBy"> {
    userId: User["userId"];
    status: ContentMember["status"];
}

export interface PlannerService {
    /**
     * Deletes planners by planner ids
     * @security Insecure: route authentication check required (user delete permission on planners)
     */
    Delete: DeleteService<Planner, "plannerId">;

    /**
     * Get planners by id or ids
     * @security Secure: no authentication checks required
     * @returns an array of planners matching given ids
     */
    Read: ReadService<PlannerReadResponse, "plannerId", Pick<User, "userId">>;

    /**
     * Get users planners. Includes planners created by the user and planners the user is a member of.
     * @security Secure: no authentication checks required.
     * @returns an array of planners.
     */
    ReadByUser: ReadMyService<PlannerReadResponse>;

    /**
     * Creates or Saves a new planner from params
     * @security Insecure: route authentication check required (user save permission on planners)
     * @returns the newly created planners
     */
    Save: SaveService<
        Planner & {
            members?: Array<Pick<ContentMember, "userId"> & { status?: UserStatus }>;
            createdBy: Content["createdBy"];
        }
    >;

    /**
     * Get planners by id or ids
     * @security Insecure
     * @returns an array of planners matching given ids, but only with minimal required fields to ensure performance
     */
    ReadPermissions: ReadService<PlannerReadPermissionsResponse, "plannerId" | "userId">;
}
