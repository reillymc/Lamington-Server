export type EntityMember<T extends Record<string, string> = {}> = T & {
    userId: string;
    status: string;
};
