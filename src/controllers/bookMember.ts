import { lamington } from "../database";
import { CreateEntityMemberActions } from "./entity";

export const BookMemberActions = CreateEntityMemberActions(lamington.bookMember, "bookId");
