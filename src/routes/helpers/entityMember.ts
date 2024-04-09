import { UserStatus } from "../spec";

export const getStatus = (status: string | undefined, isOwner?: boolean) => {
    if (isOwner) return UserStatus.Administrator;

    switch (status) {
        case UserStatus.Administrator:
        case UserStatus.Registered:
        case UserStatus.Pending:
            return status;
        default:
            return UserStatus.Pending;
    }
};
