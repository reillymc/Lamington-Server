export type EntityMember<T extends Record<string, string> = {}> = T & {
    userId: string;
    canEdit: number | undefined;
    accepted: number | undefined;
};
