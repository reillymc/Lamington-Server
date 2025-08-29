import { lamington } from "../database/index.ts";
import { CreateEntityMemberActions, type SaveEntityMemberRequest } from "./entity/index.ts";

export const ListMemberActions = CreateEntityMemberActions(lamington.listMember, "listId");

export type ListMemberActions = typeof ListMemberActions;

export type CreateListMemberParams = SaveEntityMemberRequest<lamington.listMember, "listId">;
