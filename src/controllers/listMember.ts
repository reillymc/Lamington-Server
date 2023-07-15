import { lamington } from "../database";
import { CreateEntityMemberActions, SaveEntityMemberRequest } from "./entity";

export const ListMemberActions = CreateEntityMemberActions(lamington.listMember, "listId");

export type ListMemberActions = typeof ListMemberActions;

export type CreateListMemberParams = SaveEntityMemberRequest<lamington.listMember, "listId">;
