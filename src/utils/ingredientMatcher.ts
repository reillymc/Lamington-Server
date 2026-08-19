import type { components } from "../routes/spec/schema.js";

export const AUTO_MATCH_THRESHOLD = 0.85;
export const CANDIDATE_MATCH_THRESHOLD = 0.5;
export const CANDIDATE_LIMIT = 10;

export type IngredientCandidate = {
    ingredientId: string;
    name: string;
    namePlural: string | undefined;
};

export type IngredientMatch = {
    ingredientId: string;
    name: string;
    namePlural: string | undefined;
    score: number;
};

export type IngredientMatchResult = {
    ingredient?: {
        ingredientId: string;
        name: string;
        namePlural?: string;
    };
    candidates?: ReadonlyArray<{
        ingredientId: string;
        name: string;
        namePlural?: string;
        score: number;
    }>;
};

export type IngredientMatcher = (
    name: string,
) => IngredientMatchResult | undefined;

const STOPWORDS = new Set([
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
    "fresh",
    "diced",
    "finely",
    "chopped",
    "minced",
    "grated",
    "crushed",
    "sliced",
    "slices",
    "small",
    "large",
    "big",
    "ground",
    "peeled",
    "roughly",
]);

export const normalizeIngredientName = (text: string): string =>
    text
        .toLowerCase()
        .replace(/[-\u2010-\u2015/\\]/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 0 && !STOPWORDS.has(token))
        .join(" ");

const tokenize = (text: string): ReadonlyArray<string> =>
    text.split(/\s+/).filter(Boolean);

const tokenWeight = (tokens: ReadonlyArray<string>): number =>
    tokens.reduce((sum, token) => sum + token.length, 0);

const tokenCommonWeight = (
    a: ReadonlyArray<string>,
    b: ReadonlyArray<string>,
): number => {
    const counts = new Map<string, number>();
    for (const token of b) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
    }

    let weight = 0;
    for (const token of a) {
        const count = counts.get(token);
        if (count) {
            weight += token.length;
            counts.set(token, count - 1);
        }
    }
    return weight;
};

export const scoreIngredient = (
    extracted: string,
    candidate: IngredientCandidate,
): number => {
    const extractedTokens = tokenize(normalizeIngredientName(extracted));
    if (extractedTokens.length === 0) return 0;
    const extractedWeight = tokenWeight(extractedTokens);

    const surfaces = [normalizeIngredientName(candidate.name)];
    if (candidate.namePlural) {
        surfaces.push(normalizeIngredientName(candidate.namePlural));
    }

    let best = 0;
    for (const surface of surfaces) {
        const candidateTokens = tokenize(surface);
        const common = tokenCommonWeight(extractedTokens, candidateTokens);
        if (common === 0) continue;

        const dice =
            (2 * common) / (extractedWeight + tokenWeight(candidateTokens));
        best = Math.max(best, dice);
    }
    return best;
};

export const rankMatches = (
    extracted: string,
    candidates: ReadonlyArray<IngredientCandidate>,
): IngredientMatch[] =>
    candidates
        .map((candidate) => ({
            ingredientId: candidate.ingredientId,
            name: candidate.name,
            namePlural: candidate.namePlural,
            score: scoreIngredient(extracted, candidate),
        }))
        .filter((match) => match.score >= CANDIDATE_MATCH_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, CANDIDATE_LIMIT);

export const matchIngredient = (
    extracted: string,
    candidates: ReadonlyArray<IngredientCandidate>,
): IngredientMatch | undefined => {
    const [best] = rankMatches(extracted, candidates);
    return best && best.score >= AUTO_MATCH_THRESHOLD ? best : undefined;
};

export const createIngredientMatcher =
    (candidates: ReadonlyArray<IngredientCandidate>): IngredientMatcher =>
    (name: string): IngredientMatchResult | undefined => {
        const matches = rankMatches(name, candidates);
        const [best] = matches;
        if (!best) return undefined;

        return {
            ingredient:
                best.score >= AUTO_MATCH_THRESHOLD
                    ? {
                          ingredientId: best.ingredientId,
                          name: best.name,
                          namePlural: best.namePlural,
                      }
                    : undefined,
            candidates: matches,
        };
    };

export const matchRecipeIngredients = (
    recipe: components["schemas"]["ExtractedRecipe"],
    matcher: IngredientMatcher,
): components["schemas"]["ExtractedRecipe"] => ({
    ...recipe,
    ingredients: recipe.ingredients?.map((section) => ({
        ...section,
        items: section.items.map((item) => {
            if (!item.name) return item;
            const match = matcher(item.name);
            if (!match) return item;
            return {
                ...item,
                ingredient: match.ingredient,
                ingredientCandidates: match.candidates,
            };
        }),
    })),
});
