const SEARCH_SYNTAX_STOPWORDS = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "for",
    "with",
    "to",
    "in",
    "on",
    "into",
    "some",
    "of",
]);

const MATCH_FALLBACK_STOPWORDS = new Set([
    "sliced",
    "slices",
    "small",
    "large",
    "big",
]);

const STOPWORDS = new Set([
    ...SEARCH_SYNTAX_STOPWORDS,
    ...MATCH_FALLBACK_STOPWORDS,
]);

export type PreparedSearchSurface = {
    tokens: ReadonlyArray<string>;
    weight: number;
    counts: ReadonlyMap<string, number>;
};

export const normalizeIngredientSearchText = (text: string): string =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 0 && !STOPWORDS.has(token))
        .join(" ");

export const prepareSearchSurface = (text: string): PreparedSearchSurface => {
    const tokens = normalizeIngredientSearchText(text)
        .split(/\s+/)
        .filter(Boolean);
    const counts = new Map<string, number>();
    let weight = 0;

    for (const token of tokens) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
        weight += token.length;
    }

    return { tokens, weight, counts };
};
