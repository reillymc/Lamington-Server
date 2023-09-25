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

export type NumberValue = { representation: "number"; value: string };
export type RangeValue = { representation: "range"; value: [string, string] };
export type FractionValue = { representation: "fraction"; value: [string, string, string] };
