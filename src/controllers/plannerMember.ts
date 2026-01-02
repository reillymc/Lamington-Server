import type { ContentMember } from "../database/definitions/contentMember.ts";
import type { Planner, CreateQuery, KnexDatabase } from "../database/index.ts";
import db from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";
import {
    ContentMemberActions,
    type ContentMemberStatus,
    type CreateContentMemberOptions,
} from "./content/contentMember.ts";

type SavePlannerMemberRequest = CreateQuery<{
    plannerId: Planner["plannerId"];
    members?: Array<{ userId: ContentMember["userId"]; status?: ContentMemberStatus }>;
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
            db as KnexDatabase,
            EnsureArray(request).map(({ plannerId, userId }) => ({ contentId: plannerId, members: [{ userId }] }))
        ),
    read: (request: ReadPlannerMembersRequest) =>
        ContentMemberActions.read(
            db as KnexDatabase,
            EnsureArray(request).map(({ plannerId }) => ({ contentId: plannerId }))
        ).then(response => response.map(({ contentId, ...rest }) => ({ plannerId: contentId, ...rest }))),
    save: (request: SavePlannerMemberRequest, options?: CreateContentMemberOptions) =>
        ContentMemberActions.save(
            db as KnexDatabase,
            EnsureArray(request).map(({ plannerId, members }) => ({ contentId: plannerId, members })),
            options
        ),
};

export type PlannerMemberActions = typeof PlannerMemberActions;
