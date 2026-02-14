import type { components } from "../routes/spec/index.ts";
import type { CreateService } from "./service.ts";

export interface TagService {
    getAll: () => Promise<ReadonlyArray<components["schemas"]["TagGroup"]>>;
}

export const createTagService: CreateService<TagService, "tagRepository"> = (
    database,
    { tagRepository },
) => ({
    getAll: async () => {
        const result = await tagRepository.readAll(database, undefined);

        const parents = result.filter((row) => row.parentId === undefined);
        const children = result.filter((row) => row.parentId !== undefined);

        const childrenMap = children.reduce(
            (acc, { parentId, ...child }) => {
                if (!parentId) {
                    return acc;
                }

                if (!acc[parentId]) {
                    acc[parentId] = [];
                }
                acc[parentId].push(child);
                return acc;
            },
            {} as Record<string, components["schemas"]["Tag"][]>,
        );

        return parents.map(({ parentId, ...parent }) => ({
            ...parent,
            tags: childrenMap[parent.tagId],
        }));
    },
});
