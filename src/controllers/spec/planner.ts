import type {
    DeleteService,
    Planner,
    PlannerMember,
    ReadMyService,
    ReadService,
    SaveService,
    User,
} from "../../database/index.ts";
import type { EntityMember } from "../entity/index.ts";

interface PlannerReadResponse
    extends Pick<Planner, "plannerId" | "name" | "customisations" | "createdBy" | "description"> {
    createdByName: User["firstName"];
    status: PlannerMember["status"];
}

interface PlannerReadPermissionsResponse extends Pick<Planner, "plannerId" | "createdBy"> {
    userId: User["userId"];
    status: PlannerMember["status"];
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
    Save: SaveService<Planner & { members?: Array<EntityMember> }>;

    /**
     * Get planners by id or ids
     * @security Insecure
     * @returns an array of planners matching given ids, but only with minimal required fields to ensure performance
     */
    ReadPermissions: ReadService<PlannerReadPermissionsResponse, "plannerId" | "userId">;
}
