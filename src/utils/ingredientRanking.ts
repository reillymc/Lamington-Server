import { ExtractionLimitError } from "./errors.ts";
import { MAX_MATCH_CANDIDATES, MAX_MATCH_WORK } from "./extractionLimits.ts";
import {
    type PreparedSearchSurface,
    prepareSearchSurface,
} from "./ingredientSearchNormalization.ts";

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

type RankedMatch = IngredientMatch & {
    candidateIndex: number;
    bestSurfaceIndex: number;
    bestSurfaceScore: number;
};

type QuerySurface = PreparedSearchSurface & {
    importance: number;
};

type PreparedCandidate = {
    candidate: IngredientCandidate;
    surfaces: ReadonlyArray<PreparedSearchSurface>;
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

const prepareCandidate = (
    candidate: IngredientCandidate,
): PreparedCandidate => {
    const surfaces: PreparedSearchSurface[] = [];
    const seen = new Set<string>();

    const addSurface = (text: string | undefined): void => {
        if (!text) return;

        const surface = prepareSearchSurface(text);
        if (surface.tokens.length === 0) return;

        const key = surface.tokens.join(" ");
        if (seen.has(key)) return;

        seen.add(key);
        surfaces.push(surface);
    };

    addSurface(candidate.name);
    addSurface(candidate.namePlural);

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
    a: PreparedSearchSurface,
    b: PreparedSearchSurface,
): number => {
    const [small, large] = a.counts.size <= b.counts.size ? [a, b] : [b, a];

    let weight = 0;
    for (const [token, count] of small.counts) {
        const otherCount = large.counts.get(token);
        if (!otherCount) continue;

        weight += Math.min(count, otherCount) * token.length;
    }
    return weight;
};

const scorePreparedIngredient = (
    extracted: PreparedSearchSurface,
    candidate: PreparedCandidate,
): number => {
    if (extracted.tokens.length === 0) return 0;

    let best = 0;
    for (const surface of candidate.surfaces) {
        const common = tokenCommonWeight(extracted, surface);
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
        prepareSearchSurface(extracted),
        prepareCandidate(candidate),
    );

const compareRankedMatches = (a: RankedMatch, b: RankedMatch): number =>
    b.score - a.score ||
    a.bestSurfaceIndex - b.bestSurfaceIndex ||
    b.bestSurfaceScore - a.bestSurfaceScore ||
    a.candidateIndex - b.candidateIndex;

const rankPreparedMatches = (
    querySurfaces: ReadonlyArray<QuerySurface>,
    preparedCandidates: PreparedCandidates,
    budget: MatchBudget,
): IngredientMatch[] => {
    if (querySurfaces.length === 0) return [];

    const queryTokens = new Set<string>();
    for (const surface of querySurfaces) {
        for (const token of surface.tokens) {
            queryTokens.add(token);
        }
    }

    const candidateIndexes = new Set<number>();
    for (const token of queryTokens) {
        const indexes = preparedCandidates.postings.get(token) ?? [];
        consumeWork(budget, indexes.length);
        for (const candidateIndex of indexes) {
            candidateIndexes.add(candidateIndex);
        }
    }

    const bestByIngredient = new Map<string, RankedMatch>();
    for (const candidateIndex of candidateIndexes) {
        consumeWork(budget, querySurfaces.length);

        const prepared = preparedCandidates.candidates[candidateIndex];
        if (!prepared) continue;

        let weightedScore = 0;
        let matchedWeight = 0;
        let bestSurfaceScore = 0;
        let bestSurfaceIndex = -1;

        for (const [surfaceIndex, surface] of querySurfaces.entries()) {
            const surfaceScore = scorePreparedIngredient(surface, prepared);
            if (surfaceScore <= 0) continue;

            weightedScore += surfaceScore * surface.importance;
            matchedWeight += surface.importance;

            if (surfaceScore > bestSurfaceScore) {
                bestSurfaceScore = surfaceScore;
                bestSurfaceIndex = surfaceIndex;
            }
        }

        if (matchedWeight === 0) continue;

        const score = weightedScore / matchedWeight;
        if (score < CANDIDATE_MATCH_THRESHOLD) continue;

        const match: RankedMatch = {
            ingredientId: prepared.candidate.ingredientId,
            name: prepared.candidate.name,
            namePlural: prepared.candidate.namePlural,
            score,
            candidateIndex,
            bestSurfaceIndex,
            bestSurfaceScore,
        };

        const existing = bestByIngredient.get(match.ingredientId);
        if (!existing || compareRankedMatches(match, existing) < 0) {
            bestByIngredient.set(match.ingredientId, match);
        }
    }

    return [...bestByIngredient.values()]
        .sort(compareRankedMatches)
        .slice(0, CANDIDATE_LIMIT)
        .map(({ ingredientId, name, namePlural, score }) => ({
            ingredientId,
            name,
            namePlural,
            score,
        }));
};

export const createIngredientMatcher = (
    candidates: ReadonlyArray<IngredientCandidate>,
) => {
    const preparedCandidates = prepareCandidates(candidates);
    const budget: MatchBudget = { remaining: MAX_MATCH_WORK };

    return {
        rank: (querySurfaces: ReadonlyArray<QuerySurface>): IngredientMatch[] =>
            rankPreparedMatches(querySurfaces, preparedCandidates, budget),
    };
};
