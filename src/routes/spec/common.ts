import { User } from "./user";

export type EntityMember = {
    userId: User["userId"];
    firstName?: User["firstName"];
    lastName?: User["lastName"];
    allowEditing?: boolean;
};

export type EntityMembers = {
    [userId: User["userId"]]: EntityMember;
};
