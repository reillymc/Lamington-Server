import { lamington } from "../database";
import { CreateEntityMemberActions, SaveEntityMemberRequest } from "./entity";

export const BookMemberActions = CreateEntityMemberActions(lamington.bookMember, "bookId");

export type BookMemberActions = typeof BookMemberActions;

export type CreateBookMemberParams = SaveEntityMemberRequest<lamington.bookMember, "bookId">;
