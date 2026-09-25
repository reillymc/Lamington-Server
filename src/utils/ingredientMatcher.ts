import type { components } from "../routes/spec/schema.js";
import { ExtractionLimitError } from "./errors.ts";
import {
    MAX_EXTRACTED_INGREDIENTS,
    MAX_MATCH_CANDIDATES,
    MAX_MATCH_WORK,
} from "./extractionLimits.ts";

export const AUTO_MATCH_THRESHOLD = 0.85;
export const CANDIDATE_MATCH_THRESHOLD = 0.5;
export const CANDIDATE_LIMIT = 10;

export type IngredientCandidate = {
    ingredientId: string;
    name: string;
    namePlural: string | undefined;
};

type IngredientMatch = {
    ingredientId: string;
    name: string;
    namePlural: string | undefined;
    score: number;
};

type PreparedExtracted = {
    tokens: ReadonlyArray<string>;
    weight: number;
};

type PreparedSurface = {
    tokens: ReadonlyArray<string>;
    weight: number;
};

type PreparedCandidate = {
    candidate: IngredientCandidate;
    surfaces: ReadonlyArray<PreparedSurface>;
    tokens: Set<string>;
};

type PreparedCandidates = {
    candidates: ReadonlyArray<PreparedCandidate>;
    postings: Map<string, number[]>;
};

type MatchBudget = {
    remaining: number;
};

const consumeWork = (budget: MatchBudget, amount = 1): void => {
    if (budget.remaining < amount) {
        throw new ExtractionLimitError(
            "Ingredient matching work limit exceeded",
        );
    }
    budget.remaining -= amount;
};

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

const prepareExtracted = (extracted: string): PreparedExtracted => {
    const tokens = tokenize(normalizeIngredientName(extracted));
    return { tokens, weight: tokenWeight(tokens) };
};

const prepareSurface = (surface: string): PreparedSurface => {
    const tokens = tokenize(normalizeIngredientName(surface));
    return { tokens, weight: tokenWeight(tokens) };
};

const prepareCandidate = (
    candidate: IngredientCandidate,
): PreparedCandidate => {
    const surfaces = [prepareSurface(candidate.name)];
    if (candidate.namePlural) {
        surfaces.push(prepareSurface(candidate.namePlural));
    }

    const tokens = new Set<string>();
    for (const surface of surfaces) {
        for (const token of surface.tokens) {
            tokens.add(token);
        }
    }

    return { candidate, surfaces, tokens };
};

const prepareCandidates = (
    candidates: ReadonlyArray<IngredientCandidate>,
): PreparedCandidates => {
    if (candidates.length > MAX_MATCH_CANDIDATES) {
        throw new ExtractionLimitError("Too many ingredient candidates");
    }

    const prepared = candidates.map(prepareCandidate);
    const postings = new Map<string, number[]>();
    prepared.forEach(({ tokens }, candidateIndex) => {
        for (const token of tokens) {
            const indexes = postings.get(token) ?? [];
            indexes.push(candidateIndex);
            postings.set(token, indexes);
        }
    });

    return { candidates: prepared, postings };
};

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

const scorePreparedIngredient = (
    extracted: PreparedExtracted,
    candidate: PreparedCandidate,
): number => {
    if (extracted.tokens.length === 0) return 0;

    let best = 0;
    for (const surface of candidate.surfaces) {
        const common = tokenCommonWeight(extracted.tokens, surface.tokens);
        if (common === 0) continue;

        const dice = (2 * common) / (extracted.weight + surface.weight);
        best = Math.max(best, dice);
    }
    return best;
};

export const scoreIngredient = (
    extracted: string,
    candidate: IngredientCandidate,
): number =>
    scorePreparedIngredient(
        prepareExtracted(extracted),
        prepareCandidate(candidate),
    );

const addRankedMatch = (
    matches: IngredientMatch[],
    match: IngredientMatch,
): void => {
    const insertAt = matches.findIndex(
        (existing) => match.score > existing.score,
    );

    if (insertAt === -1) {
        if (matches.length < CANDIDATE_LIMIT) {
            matches.push(match);
        }
        return;
    }

    matches.splice(insertAt, 0, match);
    if (matches.length > CANDIDATE_LIMIT) {
        matches.pop();
    }
};

const rankPreparedMatches = (
    extracted: string,
    preparedCandidates: PreparedCandidates,
    budget: MatchBudget,
): IngredientMatch[] => {
    const extractedInfo = prepareExtracted(extracted);
    if (extractedInfo.tokens.length === 0) return [];

    const candidateIndexes = new Set<number>();
    for (const token of extractedInfo.tokens) {
        const indexes = preparedCandidates.postings.get(token) ?? [];
        consumeWork(budget, indexes.length);
        for (const candidateIndex of indexes) {
            candidateIndexes.add(candidateIndex);
        }
    }

    const matches: IngredientMatch[] = [];
    for (const candidateIndex of [...candidateIndexes].sort((a, b) => a - b)) {
        consumeWork(budget);

        const prepared = preparedCandidates.candidates[candidateIndex];
        if (!prepared) continue;
        const score = scorePreparedIngredient(extractedInfo, prepared);
        if (score < CANDIDATE_MATCH_THRESHOLD) continue;

        addRankedMatch(matches, {
            ingredientId: prepared.candidate.ingredientId,
            name: prepared.candidate.name,
            namePlural: prepared.candidate.namePlural,
            score,
        });
    }

    return matches;
};

export const rankMatches = (
    extracted: string,
    candidates: ReadonlyArray<IngredientCandidate>,
): IngredientMatch[] =>
    rankPreparedMatches(extracted, prepareCandidates(candidates), {
        remaining: MAX_MATCH_WORK,
    });

export const matchRecipeIngredients = (
    recipe: components["schemas"]["ExtractedRecipe"],
    candidates: ReadonlyArray<IngredientCandidate>,
): components["schemas"]["ExtractedRecipe"] => {
    const preparedCandidates = prepareCandidates(candidates);
    const budget: MatchBudget = { remaining: MAX_MATCH_WORK };
    let itemCount = 0;

    return {
        ...recipe,
        ingredients: recipe.ingredients?.map((section) => ({
            ...section,
            items: section.items.map((item) => {
                if (!item.name) return item;

                itemCount += 1;
                if (itemCount > MAX_EXTRACTED_INGREDIENTS) {
                    throw new ExtractionLimitError(
                        "Recipe contains too many ingredients",
                    );
                }

                const matches = rankPreparedMatches(
                    item.name,
                    preparedCandidates,
                    budget,
                );
                const [best] = matches;
                if (!best) return item;

                return {
                    ...item,
                    ingredient:
                        best.score >= AUTO_MATCH_THRESHOLD
                            ? {
                                  ingredientId: best.ingredientId,
                                  name: best.name,
                                  namePlural: best.namePlural,
                              }
                            : undefined,
                    ingredientCandidates: matches,
                };
            }),
        })),
    };
};
