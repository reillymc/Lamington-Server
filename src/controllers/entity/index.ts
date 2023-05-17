import { User } from "../../database";

export { CreateEntityMemberActions, CreateEntityMemberParams } from "./entityMember";

export type EntityMember = {
    userId: User["userId"];
    allowEditing?: boolean;
};
