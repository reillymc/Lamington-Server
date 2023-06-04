import { lamington } from "../database";
import { CreateEntityMemberActions, SaveEntityMemberRequest } from "./entity";

export const PlannerMemberActions = CreateEntityMemberActions(lamington.plannerMember, "plannerId");

export type CreatePlannerMemberParams = SaveEntityMemberRequest<lamington.plannerMember, "plannerId">;
