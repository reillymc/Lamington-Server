import { UserStatus } from "../spec";

export const getStatus = (status: string | undefined, isOwner?: boolean) => {
    if (isOwner) return UserStatus.Owner;

    switch (status) {
        case UserStatus.Administrator:
        case UserStatus.Member:
        case UserStatus.Blacklisted:
        case UserStatus.Pending:
            return status;
        default:
            return undefined;
    }
};
