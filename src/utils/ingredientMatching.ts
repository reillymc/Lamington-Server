import type { components as extractorComponents } from "../integrations/extractor/spec/index.ts";
import type { components } from "../routes/spec/index.ts";
import { ExtractionLimitError } from "./errors.ts";
import { MAX_EXTRACTED_INGREDIENTS } from "./extractionLimits.ts";
import {
    createIngredientMatcher,
    type IngredientCandidate,
} from "./ingredientRanking.ts";
import {
    type PreparedSearchSurface,
    prepareSearchSurface,
} from "./ingredientSearchNormalization.ts";

export const AUTO_MATCH_THRESHOLD = 0.85;

const NAME_SURFACE_WEIGHT = 5;
const FIRST_VARIANT_SURFACE_WEIGHT = 1;
const VARIANT_SURFACE_WEIGHT = 0.5;

type QuerySurface = PreparedSearchSurface & {
    importance: number;
};

type MatchableExtractedRecipe = Omit<
    components["schemas"]["ExtractedRecipe"],
    "ingredients"
> & {
    readonly ingredients?: ReadonlyArray<
        extractorComponents["schemas"]["ExtractedRecipeIngredientSection"]
    >;
};

const variantSurfaceImportance = (index: number): number =>
    index === 0 ? FIRST_VARIANT_SURFACE_WEIGHT : VARIANT_SURFACE_WEIGHT;

const indexedSurfaceImportance = (index: number): number =>
    index === 0 ? NAME_SURFACE_WEIGHT : variantSurfaceImportance(index - 1);

const prepareQuerySurfaces = (
    surfaces: ReadonlyArray<{ text: string; importance: number }>,
): ReadonlyArray<QuerySurface> => {
    const prepared: QuerySurface[] = [];
    const seen = new Set<string>();

    for (const { text, importance } of surfaces) {
        const surface = { ...prepareSearchSurface(text), importance };
        if (surface.tokens.length === 0) continue;

        const key = surface.tokens.join(" ");
        if (seen.has(key)) continue;

        seen.add(key);
        prepared.push(surface);
    }

    return prepared;
};

const getQuerySurfaces = (
    item: extractorComponents["schemas"]["ExtractedRecipeIngredientItem"],
): ReadonlyArray<QuerySurface> => {
    const surfaces: Array<{ text: string; importance: number }> = [];

    if (item.name) {
        surfaces.push({
            text: item.name,
            importance: NAME_SURFACE_WEIGHT,
        });
    }

    for (const [index, variant] of (item.variants ?? []).entries()) {
        surfaces.push({
            text: variant,
            importance: variantSurfaceImportance(index),
        });
    }

    return prepareQuerySurfaces(surfaces);
};

export const rankMatches = (
    extracted: string | ReadonlyArray<string>,
    candidates: ReadonlyArray<IngredientCandidate>,
) => {
    const surfaces = typeof extracted === "string" ? [extracted] : extracted;

    return createIngredientMatcher(candidates).rank(
        prepareQuerySurfaces(
            surfaces.map((text, index) => ({
                text,
                importance: indexedSurfaceImportance(index),
            })),
        ),
    );
};

export const matchRecipeIngredients = (
    recipe: MatchableExtractedRecipe,
    candidates: ReadonlyArray<IngredientCandidate>,
): components["schemas"]["ExtractedRecipe"] => {
    const matcher = createIngredientMatcher(candidates);
    let itemCount = 0;

    return {
        ...recipe,
        ingredients: recipe.ingredients?.map((section) => ({
            ...section,
            items: section.items.map((item) => {
                const { variants: _variants, ...publicItem } = item;
                const querySurfaces = getQuerySurfaces(item);
                if (querySurfaces.length === 0) return publicItem;

                itemCount += 1;
                if (itemCount > MAX_EXTRACTED_INGREDIENTS) {
                    throw new ExtractionLimitError(
                        "Recipe contains too many ingredients",
                    );
                }

                const matches = matcher.rank(querySurfaces);
                const [best] = matches;
                if (!best) return publicItem;

                return {
                    ...publicItem,
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
