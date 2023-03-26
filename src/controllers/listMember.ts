import { lamington } from "../database";
import { CreateEntityMemberActions } from "./entity";

export const ListMemberActions = CreateEntityMemberActions(lamington.listMember, "listId");
