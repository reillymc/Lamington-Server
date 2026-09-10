export type Owner = {
    userId: string;
    firstName: string;
};

export type HeroImage = {
    attachmentId: string;
    uri: string;
};

export type MemberResponseItem<Status extends string> = Owner & {
    lastName: string;
    status: Status | undefined;
};
