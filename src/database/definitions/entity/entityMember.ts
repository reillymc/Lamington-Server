export type EntityMember<T extends Record<string, string> = {}> = T & {
    userId: string;
    canEdit: string | undefined;
    accepted: number | undefined;
};
