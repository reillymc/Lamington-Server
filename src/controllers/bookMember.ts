import { lamington } from "../database/index.ts";
import { CreateEntityMemberActions, type SaveEntityMemberRequest } from "./entity/index.ts";

export const BookMemberActions = CreateEntityMemberActions(lamington.bookMember, "bookId");

export type BookMemberActions = typeof BookMemberActions;

export type CreateBookMemberParams = SaveEntityMemberRequest<lamington["bookMember"], "bookId">;
