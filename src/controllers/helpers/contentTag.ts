import type { ContentTag } from "../../database/index.ts";
import { Undefined } from "../../utils/index.ts";
import type { ContentTags } from "../spec/recipe.ts";

export const ContentTagsRequestToRows = (contentId: string, tags: ContentTags = {}): ContentTag[] =>
    Object.values(tags)
        .flatMap(({ tags }) =>
            tags?.map(({ tagId }) => ({
                contentId,
                tagId,
            }))
        )
        .filter(Undefined);
