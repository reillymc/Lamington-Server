import type { UserStatus } from "./user.ts";

export type EntityMember = {
    userId: string;
    firstName?: string;
    lastName?: string;
    status?: UserStatus;
};

export type EntityMembers = {
    [userId: string]: EntityMember;
};

export type NumberValue = { representation: "number"; value: string };
export type RangeValue = { representation: "range"; value: [string, string] };
export type FractionValue = {
    representation: "fraction";
    value: [string, string, string];
};
