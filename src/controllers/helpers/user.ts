import { UserStatus } from "../../routes/spec";

export const userStatusToUserStatus = (status: string) => {
    switch (status) {
        case "A":
            return UserStatus.Administrator;
        case "R":
            return UserStatus.Registered;
        case "B":
            return UserStatus.Blacklisted;
    }
    return UserStatus.Pending;
};
