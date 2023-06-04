import { User } from "../../database";

export { CreateEntityMemberActions, SaveEntityMemberRequest } from "./entityMember";

export type EntityMember = {
    userId: User["userId"];
    allowEditing?: boolean;
};
