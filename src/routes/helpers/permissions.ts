import { UserStatus } from "../spec/user.ts";

export const validatePermissions = (
    statuses: Array<UserStatus | undefined>,
    permissionLevel: Exclude<UserStatus, typeof UserStatus.Blacklisted>
): boolean => {
    if (!areValidStatuses(statuses)) {
        return false;
    }

    const validator = {
        [UserStatus.Owner]: isOwner,
        [UserStatus.Administrator]: isAtLeastAdmin,
        [UserStatus.Member]: isAtLeastMember,
        [UserStatus.Pending]: isAtLeastPending,
    }[permissionLevel];

    return statuses.every(validator);
};

const areValidStatuses = (statuses: Array<UserStatus | undefined>): statuses is Array<UserStatus> => {
    return !statuses.some(status => status === undefined);
};

const isOwner = (status: UserStatus | undefined): status is typeof UserStatus.Owner => {
    return status == UserStatus.Owner;
};

const isAtLeastAdmin = (status: UserStatus): status is typeof UserStatus.Owner | typeof UserStatus.Administrator => {
    switch (status) {
        case UserStatus.Owner:
        case UserStatus.Administrator:
            return true;
        default:
            return false;
    }
};

const isAtLeastMember = (
    status: UserStatus
): status is typeof UserStatus.Owner | typeof UserStatus.Administrator | typeof UserStatus.Member => {
    switch (status) {
        case UserStatus.Owner:
        case UserStatus.Administrator:
        case UserStatus.Member:
            return true;
        default:
            return false;
    }
};

const isAtLeastPending = (
    status: UserStatus
): status is
    | typeof UserStatus.Owner
    | typeof UserStatus.Administrator
    | typeof UserStatus.Member
    | typeof UserStatus.Pending => {
    switch (status) {
        case UserStatus.Owner:
        case UserStatus.Administrator:
        case UserStatus.Member:
        case UserStatus.Pending:
            return true;
        default:
            return false;
    }
};
