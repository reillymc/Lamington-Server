import type { ContentTag } from "../../database/index.ts";

export const ContentTagsRequestToRows = (contentId: string, tags: Array<{ tagId: string }>): ContentTag[] =>
    tags.map(({ tagId }) => ({ contentId, tagId }));
