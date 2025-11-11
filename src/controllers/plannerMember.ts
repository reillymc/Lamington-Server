import type { ContentMember } from "../database/definitions/contentMember.ts";
import type { Planner, CreateQuery } from "../database/index.ts";
import type { UserStatus } from "../routes/spec/user.ts";
import { EnsureArray } from "../utils/index.ts";
import { ContentMemberActions, type CreateContentMemberOptions } from "./content/contentMember.ts";

type SavePlannerMemberRequest = CreateQuery<{
    plannerId: Planner["plannerId"];
    members?: Array<{ userId: ContentMember["userId"]; status?: UserStatus }>;
}>;

type DeletePlannerMemberRequest = CreateQuery<{
    plannerId: Planner["plannerId"];
    userId: ContentMember["userId"];
}>;

type ReadPlannerMembersRequest = CreateQuery<{
    plannerId: Planner["plannerId"];
}>;

export const PlannerMemberActions = {
    delete: (request: DeletePlannerMemberRequest) =>
        ContentMemberActions.delete(
            EnsureArray(request).map(({ plannerId, userId }) => ({ contentId: plannerId, userId }))
        ),
    read: (request: ReadPlannerMembersRequest) =>
        ContentMemberActions.read(EnsureArray(request).map(({ plannerId }) => ({ contentId: plannerId }))).then(
            response => response.map(({ contentId, ...rest }) => ({ plannerId: contentId, ...rest }))
        ),
    save: (request: SavePlannerMemberRequest, options?: CreateContentMemberOptions) =>
        ContentMemberActions.save(
            EnsureArray(request).map(({ plannerId, members }) => ({ contentId: plannerId, members })),
            options
        ),
};

export type PlannerMemberActions = typeof PlannerMemberActions;
