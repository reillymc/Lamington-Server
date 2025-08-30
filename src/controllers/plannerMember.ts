import { lamington } from "../database/index.ts";
import { CreateEntityMemberActions, type SaveEntityMemberRequest } from "./entity/index.ts";

export const PlannerMemberActions = CreateEntityMemberActions(lamington.plannerMember, "plannerId");

export type PlannerMemberActions = typeof PlannerMemberActions;

export type CreatePlannerMemberParams = SaveEntityMemberRequest<lamington["plannerMember"], "plannerId">;
