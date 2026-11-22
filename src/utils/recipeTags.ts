import type { components } from "../routes/spec/index.ts";
import type { TagCandidates } from "../services/extractor/spec/index.ts";
import { ExtractionLimitError } from "./errors.ts";
import { MAX_TAG_CANDIDATES } from "./extractionLimits.ts";

type TagRow = {
    tagId: string;
    name: string;
    parentId?: string | null;
};

const TAG_GROUPS = [
    {
        source: "cuisine",
        groups: ["Cuisine"],
    },
    {
        source: "category",
        groups: ["Meal", "Dietary"],
    },
    {
        source: "keywords",
        groups: ["Cuisine", "Meal", "Dietary", "Season", "Difficulty"],
    },
] as const;

export const mapTagCandidates = (
    candidates: TagCandidates | undefined,
    tags: ReadonlyArray<TagRow>,
): components["schemas"]["RecipeTagRef"][] | undefined => {
    if (!candidates) return undefined;

    const parentsByName = new Map<string, TagRow>();
    const childrenByParentId = new Map<string, TagRow[]>();

    for (const tag of tags) {
        if (tag.parentId) {
            const children = childrenByParentId.get(tag.parentId) ?? [];
            children.push(tag);
            childrenByParentId.set(tag.parentId, children);
        } else {
            parentsByName.set(tag.name.toLowerCase(), tag);
        }
    }

    const matchedTags = new Map<
        string,
        components["schemas"]["RecipeTagRef"]
    >();
    let candidateCount = 0;

    for (const config of TAG_GROUPS) {
        const groupChildren = config.groups.flatMap((group) => {
            const parent = parentsByName.get(group.toLowerCase());
            return parent ? (childrenByParentId.get(parent.tagId) ?? []) : [];
        });

        for (const candidate of candidates[config.source] ?? []) {
            candidateCount += 1;
            if (candidateCount > MAX_TAG_CANDIDATES) {
                throw new ExtractionLimitError(
                    "Recipe contains too many tag candidates",
                );
            }

            const normalized = candidate.trim().toLowerCase();
            if (!normalized) continue;

            for (const tag of groupChildren) {
                if (tag.name.toLowerCase() === normalized) {
                    matchedTags.set(tag.tagId, { tagId: tag.tagId });
                }
            }
        }
    }

    return matchedTags.size > 0 ? [...matchedTags.values()] : undefined;
};
