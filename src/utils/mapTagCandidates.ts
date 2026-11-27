import type { components } from "../routes/spec/index.ts";
import { ExtractionLimitError } from "./errors.ts";
import { MAX_TAG_CANDIDATES } from "./extractionLimits.ts";

type TagCandidates = {
    cuisine?: readonly string[];
    category?: readonly string[];
    keywords?: readonly string[];
};

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

const buildTagIdsByName = (
    groups: ReadonlyArray<string>,
    parentsByName: ReadonlyMap<string, TagRow>,
    childrenByParentId: ReadonlyMap<string, ReadonlyArray<TagRow>>,
): ReadonlyMap<string, ReadonlyArray<string>> => {
    const tagIdsByName = new Map<string, string[]>();

    for (const group of groups) {
        const parent = parentsByName.get(group.toLowerCase());
        if (!parent) continue;

        for (const tag of childrenByParentId.get(parent.tagId) ?? []) {
            const name = tag.name.toLowerCase();
            const tagIds = tagIdsByName.get(name) ?? [];
            tagIds.push(tag.tagId);
            tagIdsByName.set(name, tagIds);
        }
    }

    return tagIdsByName;
};

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

    const groupsBySource = TAG_GROUPS.map((config) => ({
        source: config.source,
        tagIdsByName: buildTagIdsByName(
            config.groups,
            parentsByName,
            childrenByParentId,
        ),
    }));

    const matchedTags = new Map<
        string,
        components["schemas"]["RecipeTagRef"]
    >();
    let candidateCount = 0;

    for (const { source, tagIdsByName } of groupsBySource) {
        for (const candidate of candidates[source] ?? []) {
            candidateCount += 1;
            if (candidateCount > MAX_TAG_CANDIDATES) {
                throw new ExtractionLimitError(
                    "Recipe contains too many tag candidates",
                );
            }

            const normalized = candidate.trim().toLowerCase();
            if (!normalized) continue;

            for (const tagId of tagIdsByName.get(normalized) ?? []) {
                matchedTags.set(tagId, { tagId });
            }
        }
    }

    return matchedTags.size > 0 ? [...matchedTags.values()] : undefined;
};
