export const UserStatus = {
    /**
     * Owner user. A user with this status can perform any actions on a resource.
     */
    Owner: "O",

    /**
     * Administrator user. A user with this status can accept user registrations and modify a resource.
     */
    Administrator: "A",

    /**
     * Registered user. A user with this status can access a resource.
     */
    Member: "M",

    /**
     * Pending user. A user with this status has requested or been invited to become a member.
     */
    Pending: "P",

    /**
     * Banned user. A user with this status cannot access a resource.
     */
    Blacklisted: "B",
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
