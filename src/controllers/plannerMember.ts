import { lamington } from "../database";
import { CreateEntityMemberActions } from "./entity";

export const PlannerMemberActions = CreateEntityMemberActions(lamington.plannerMember, "plannerId");
