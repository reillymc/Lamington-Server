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
            (acc, child) => {
                const key = child.parentId as string;
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(child);
                return acc;
            },
            {} as Record<string, typeof children>,
        );

        return parents.map((parent) => ({
            ...parent,
            tags: childrenMap[parent.tagId],
        }));
    },
});
