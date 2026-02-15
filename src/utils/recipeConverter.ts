import { load } from "cheerio";
import moment from "moment";
import type { HowToSection, Recipe as RecipeSchema } from "schema-dts";
import { v4 as Uuid, v4 } from "uuid";
import { DEFINITIONS } from "../database/seeds/production/01-default_tags.ts";
import type { components } from "../routes/spec/schema.js";
import { EnsureArray, Undefined } from "./index.ts";

type NumberAmount = components["schemas"]["AmountNumber"];
type FractionAmount = components["schemas"]["AmountFraction"];
type RangeAmount = components["schemas"]["AmountRange"];
type Amount = NumberAmount | FractionAmount | RangeAmount;
type ParsedIngredient = components["schemas"]["RecipeIngredientItem"];
type TagRef = { tagId: string };

export const isRecipe = (input: unknown): input is RecipeSchema => {
    if (!input || typeof input !== "object") {
        return false;
    }
    const type = "@type" in input ? input["@type"] : undefined;
    if (type === "Recipe") return true;
    if (Array.isArray(type) && type.includes("Recipe")) return true;
    return false;
};

export const findRecipe = (input: unknown): RecipeSchema | undefined => {
    if (isRecipe(input)) return input;
    if (Array.isArray(input)) {
        for (const item of input) {
            const found = findRecipe(item);
            if (found) return found;
        }
    }
    if (typeof input === "object" && input && "@graph" in input) {
        return findRecipe(input["@graph"]);
    }
    return undefined;
};

const decodeHtml = (html: string | undefined) => {
    if (!html) return undefined;
    const text = load(html).text().trim();
    return text.length > 0 ? text : undefined;
};

const parseDuration = (duration?: unknown): number | undefined => {
    if (!duration) return undefined;

    let durationString = "";
    if (typeof duration === "string") {
        durationString = duration;
    } else if (Array.isArray(duration)) {
        const item = duration.find((d) => typeof d === "string");
        if (item) durationString = item;
    }

    if (!durationString) return undefined;

    const d = moment.duration(durationString);
    const minutes = d.asMinutes();
    return minutes > 0 ? minutes : undefined;
};

const parseYield = (
    recipeYield?: RecipeSchema["recipeYield"],
): components["schemas"]["ExtractedRecipe"]["servings"] | undefined => {
    if (recipeYield === undefined || recipeYield === null) return undefined;

    let yieldString = "";

    if (Array.isArray(recipeYield)) {
        // Sort by length descending to pick the most descriptive string, e.g. "4 people" over "4".
        const sortedYield = [...recipeYield]
            .map(String)
            .sort((a, b) => b.length - a.length);
        const item = sortedYield[0];
        if (item !== undefined) yieldString = item;
    } else if (
        typeof recipeYield === "string" ||
        typeof recipeYield === "number"
    ) {
        yieldString = String(recipeYield);
    }

    if (!yieldString) return undefined;

    // Clean up common prefixes to help with parsing
    const cleanYieldString = yieldString
        .replace(/^(yield|serves|makes|for):?\s*/i, "")
        .trim();

    const rangeMatch = /(\d+)\s*(?:[-\u2013]|to)\s*(\d+)\s*(.*)/i.exec(
        cleanYieldString,
    );
    if (rangeMatch) {
        try {
            const lower = getCapture(rangeMatch, 1);
            const upper = getCapture(rangeMatch, 2);
            const unit = getCapture(rangeMatch, 3).trim();

            return {
                count: {
                    representation: "range",
                    value: [lower, upper],
                },
                unit,
            };
        } catch {
            return undefined;
        }
    }

    const singleMatch = /(\d+)\s*(.*)/.exec(cleanYieldString);
    if (singleMatch) {
        try {
            const value = getCapture(singleMatch, 1);
            const unit = getCapture(singleMatch, 2).trim();

            return {
                count: {
                    representation: "number",
                    value,
                },
                unit,
            };
        } catch {
            return undefined;
        }
    }
    return undefined;
};

const calculateImageArea = (
    url: string,
    width?: unknown,
    height?: unknown,
): number => {
    if (width !== undefined && height !== undefined) {
        const w =
            typeof width === "number" ? width : parseInt(String(width), 10);
        const h =
            typeof height === "number" ? height : parseInt(String(height), 10);
        if (!Number.isNaN(w) && !Number.isNaN(h)) return w * h;
    }

    const match = /[-_](\d+)x(\d+)\.[a-zA-Z0-9]+$/.exec(url);
    if (match) {
        try {
            const w = parseInt(getCapture(match, 1), 10);
            const h = parseInt(getCapture(match, 2), 10);
            return w * h;
        } catch {
            return Number.MAX_SAFE_INTEGER;
        }
    }

    // If no dimensions are found, rank it highest to prioritize it as a potential main image.
    return Number.MAX_SAFE_INTEGER;
};

type ImageCandidate = { url: string; area: number };

/**
 * Select the best image from a collection.
 * Normalizes various image formats to candidates, ranks by area, returns URL of largest.
 * If no dimensions are found, prioritizes as main image candidate.
 */
const selectBestImage = (images: RecipeSchema["image"]): string | undefined => {
    if (!images) return undefined;

    // Normalize to candidates
    const candidates: ImageCandidate[] = EnsureArray(images)
        .map((item): ImageCandidate | undefined => {
            if (typeof item === "string") {
                const url = item.trim();
                return url ? { url, area: calculateImageArea(url) } : undefined;
            }

            if (typeof item === "object" && item) {
                // biome-ignore lint/suspicious/noExplicitAny: image can have many complex shapes
                const imgObj = item as any;
                const url = (imgObj.url ||
                    imgObj.contentUrl ||
                    imgObj.thumbnailUrl) as string | undefined;

                if (url && typeof url === "string") {
                    const trimmed = url.trim();
                    return trimmed
                        ? {
                              url: trimmed,
                              area: calculateImageArea(
                                  trimmed,
                                  imgObj.width,
                                  imgObj.height,
                              ),
                          }
                        : undefined;
                }
            }

            return undefined;
        })
        .filter(Undefined);

    // No candidates found
    if (candidates.length === 0) return undefined;

    // Sort by area descending (larger images first) and return best
    candidates.sort((a, b) => b.area - a.area);
    return candidates[0]?.url;
};

const fractions: Record<string, string> = {
    "¼": "1/4",
    "½": "1/2",
    "¾": "3/4",
    "⅓": "1/3",
    "⅔": "2/3",
    "⅕": "1/5",
    "⅖": "2/5",
    "⅗": "3/5",
    "⅘": "4/5",
    "⅙": "1/6",
    "⅚": "5/6",
    "⅛": "1/8",
    "⅜": "3/8",
    "⅝": "5/8",
    "⅞": "7/8",
};

const normalizeFraction = (str: string): string => {
    let normalized = str;
    for (const [char, replacement] of Object.entries(fractions)) {
        normalized = normalized.replace(char, replacement);
    }
    return normalized;
};

const commonFractions = [
    { val: 1 / 2, num: "1", den: "2" },
    { val: 1 / 3, num: "1", den: "3" },
    { val: 2 / 3, num: "2", den: "3" },
    { val: 1 / 4, num: "1", den: "4" },
    { val: 3 / 4, num: "3", den: "4" },
    { val: 1 / 5, num: "1", den: "5" },
    { val: 2 / 5, num: "2", den: "5" },
    { val: 3 / 5, num: "3", den: "5" },
    { val: 4 / 5, num: "4", den: "5" },
    { val: 1 / 6, num: "1", den: "6" },
    { val: 5 / 6, num: "5", den: "6" },
    { val: 1 / 8, num: "1", den: "8" },
    { val: 3 / 8, num: "3", den: "8" },
    { val: 5 / 8, num: "5", den: "8" },
    { val: 7 / 8, num: "7", den: "8" },
];

const decimalToFraction = (
    decimal: number,
): [string, string, string] | undefined => {
    const whole = Math.floor(decimal);
    const remainder = decimal - whole;
    const tolerance = 0.01;

    for (const { val, num, den } of commonFractions) {
        if (Math.abs(remainder - val) < tolerance) {
            return [String(whole), num, den];
        }
    }
    return undefined;
};

const knownUnits = new Set([
    "g",
    "gram",
    "grams",
    "kg",
    "kilogram",
    "kilograms",
    "oz",
    "ounce",
    "ounces",
    "lb",
    "pound",
    "pounds",
    "ml",
    "milliliter",
    "milliliters",
    "l",
    "liter",
    "liters",
    "tsp",
    "teaspoon",
    "teaspoons",
    "tbsp",
    "tablespoon",
    "tablespoons",
    "cup",
    "cups",
    "pinch",
    "pinches",
    "clove",
    "cloves",
]);

/**
 * Safely extract a capture group from a regex match.
 */
const getCapture = (match: RegExpExecArray, index: number): string => {
    const value = match[index];
    if (value === undefined) {
        throw new Error(`Regex capture group ${index} is undefined`);
    }
    return value;
};

/** Configuration for ingredient amount pattern parsing. Order matters: patterns are tried in sequence. */
const AMOUNT_PATTERNS = [
    {
        name: "range" as const,
        // Matches: "1-2 cups", "4 to 6", "1.5 - 2.5"
        regex: /^(\d+(?:[/.]\d+)?)\s*(?:[-\u2013]|to)\s*(\d+(?:[/.]\d+)?)\s+(.*)/i,
        extract: (
            match: RegExpExecArray,
        ): { amount: RangeAmount; remaining: string } => ({
            amount: {
                representation: "range" as const,
                value: [getCapture(match, 1), getCapture(match, 2)],
            },
            remaining: getCapture(match, 3),
        }),
    },
    {
        name: "mixed" as const,
        // Matches: "1 2/3 cups"
        regex: /^(\d+)\s+(\d+)\/(\d+)\s+(.*)/,
        extract: (
            match: RegExpExecArray,
        ): { amount: FractionAmount; remaining: string } => ({
            amount: {
                representation: "fraction" as const,
                value: [
                    getCapture(match, 1),
                    getCapture(match, 2),
                    getCapture(match, 3),
                ],
            },
            remaining: getCapture(match, 4),
        }),
    },
    {
        name: "fraction" as const,
        // Matches: "1/2 cup"
        regex: /^(\d+)\/(\d+)\s+(.*)/,
        extract: (
            match: RegExpExecArray,
        ): { amount: FractionAmount; remaining: string } => ({
            amount: {
                representation: "fraction" as const,
                value: ["0", getCapture(match, 1), getCapture(match, 2)],
            },
            remaining: getCapture(match, 3),
        }),
    },
    {
        name: "decimal" as const,
        // Matches: "1.5 cups", "2.25"
        regex: /^(\d*\.\d+)\s+(.*)/,
        extract: (
            match: RegExpExecArray,
        ): { amount: FractionAmount | NumberAmount; remaining: string } => {
            const val = parseFloat(getCapture(match, 1));
            const fraction = decimalToFraction(val);
            return {
                amount: fraction
                    ? ({
                          representation: "fraction" as const,
                          value: fraction,
                      } as FractionAmount)
                    : ({
                          representation: "number" as const,
                          value: getCapture(match, 1),
                      } as NumberAmount),
                remaining: getCapture(match, 2),
            };
        },
    },
    {
        name: "number" as const,
        // Matches: "5 cups", "10"
        regex: /^(\d+)\s*(.*)/,
        extract: (
            match: RegExpExecArray,
        ): { amount: NumberAmount; remaining: string } => ({
            amount: {
                representation: "number" as const,
                value: getCapture(match, 1),
            },
            remaining: getCapture(match, 2),
        }),
    },
] as const;

/**
 * Extract parenthetical description from ingredient text.
 * @returns [text without parentheses, description content]
 */
const extractParentheticalDescription = (
    text: string,
): [text: string, description: string | undefined] => {
    const parenMatch = /\({1,2}(.*?)\){1,2}/.exec(text);
    if (parenMatch) {
        try {
            const description = getCapture(parenMatch, 1).trim();
            return [text.replace(parenMatch[0], "").trim(), description];
        } catch {
            return [text, undefined];
        }
    }
    return [text, undefined];
};

/**
 * Extract and remove comma-separated suffix from ingredient text.
 * @returns [text without suffix, suffix content]
 */
const extractCommaSuffix = (
    text: string,
): [text: string, suffix: string | undefined] => {
    const parts = text.split(",");
    if (parts.length === 1) return [text, undefined];

    const firstPart = parts[0] ?? "";
    const suffix = parts.slice(1).join(",").trim();

    return [firstPart.trim(), suffix];
};

/**
 * Extract amount from the start of ingredient text.
 * Tries each configured pattern in order until one matches.
 * @returns [remaining text, parsed amount]
 */
const extractAmount = (
    text: string,
): [text: string, amount: Amount | undefined] => {
    for (const pattern of AMOUNT_PATTERNS) {
        const match = pattern.regex.exec(text);
        if (match) {
            const { amount, remaining } = pattern.extract(match);
            return [remaining, amount];
        }
    }
    return [text, undefined];
};

/**
 * Extract unit from the beginning of remaining text.
 * Handles both singular and plural forms (e.g. "cup" and "cups").
 * @returns [unit, remaining text as ingredient name]
 */
const extractUnit = (
    text: string,
): [unit: string | undefined, name: string] => {
    const parts = text.split(/\s+/);
    const potentialUnit = parts[0]?.toLowerCase();

    if (
        potentialUnit &&
        (knownUnits.has(potentialUnit) ||
            knownUnits.has(potentialUnit.replace(/s$/, "")))
    ) {
        const remaining = text.substring(potentialUnit.length).trim();
        return [potentialUnit, remaining];
    }

    return [undefined, text];
};

/**
 * Parse an ingredient string into components: name, amount, unit, and description.
 */
const parseIngredientString = (raw: string): ParsedIngredient => {
    let text = decodeHtml(raw)?.trim() || "";

    const [textAfterParen, parentDesc] = extractParentheticalDescription(text);
    text = textAfterParen;

    text = normalizeFraction(text);

    let [textAfterAmount, amount] = extractAmount(text);

    let [unit, nameWithSuffix] = amount
        ? extractUnit(textAfterAmount)
        : [undefined, textAfterAmount];

    let [name, commaSuffix] = extractCommaSuffix(nameWithSuffix);

    // If no amount found yet, try to parse it from the comma suffix to handle cases like "Water, 150 g"
    if (!amount && commaSuffix) {
        const [suffixAfterAmount, suffixAmount] = extractAmount(commaSuffix);
        if (suffixAmount) {
            amount = suffixAmount;
            const [suffixUnit, suffixName] = extractUnit(suffixAfterAmount);
            unit = suffixUnit;
            // The suffix parts become the name, original name stays as is
            commaSuffix = suffixName || undefined;
        }
    }

    // Combine descriptions from parentheses and remaining comma suffix
    const description = commaSuffix
        ? parentDesc
            ? `${commaSuffix}, ${parentDesc}`
            : commaSuffix
        : parentDesc;

    return {
        id: v4(),
        name,
        amount,
        unit,
        description,
    };
};

const parseIngredients = (
    recipeIngredient: RecipeSchema["recipeIngredient"],
): components["schemas"]["ExtractedRecipe"]["ingredients"] => {
    const ingredients: components["schemas"]["RecipeSectionIngredient"][] = [];
    if (recipeIngredient) {
        const rawIngredients = Array.isArray(recipeIngredient)
            ? recipeIngredient
            : [recipeIngredient];

        const items = rawIngredients
            .map((i) => parseIngredientString(i.toString()))
            .filter((i) => i.name);

        if (items.length > 0) {
            ingredients.push({
                sectionId: Uuid(),
                name: "Ingredients",
                items,
            });
        }
    }
    return ingredients;
};

const parseInstructions = (
    recipeInstructions: RecipeSchema["recipeInstructions"],
): components["schemas"]["ExtractedRecipe"]["method"] => {
    if (!recipeInstructions) return [];

    const instructions = EnsureArray(recipeInstructions);

    // biome-ignore lint/suspicious/noExplicitAny: step can have many complex shapes
    const getStepText = (step: any): string => {
        if (typeof step === "string") return step;
        if (typeof step === "object" && step) {
            if (step["@type"] === "HowToStep") {
                return step.text?.toString() || step.name?.toString() || "";
            }
            if (!step["@type"]) {
                return step.text?.toString() || "";
            }
        }
        return "";
    };

    type InstructionGroup = {
        name?: string;
        steps: readonly unknown[];
    };

    const groups: InstructionGroup[] = [];
    let currentStandaloneSteps: unknown[] = [];

    for (const inst of instructions) {
        if (
            inst &&
            typeof inst === "object" &&
            // biome-ignore lint/suspicious/noExplicitAny: instruction can have many complex shapes
            (inst as any)["@type"] === "HowToSection"
        ) {
            if (currentStandaloneSteps.length > 0) {
                groups.push({ steps: currentStandaloneSteps });
                currentStandaloneSteps = [];
            }
            const section = inst as HowToSection;
            groups.push({
                name: section.name?.toString(),
                steps: EnsureArray(section.itemListElement ?? []),
            });
        } else {
            currentStandaloneSteps.push(inst);
        }
    }

    if (currentStandaloneSteps.length > 0) {
        groups.push({ steps: currentStandaloneSteps });
    }

    return groups
        .map((group) => {
            const items = group.steps
                .map((step) => ({
                    id: v4(),
                    description: decodeHtml(getStepText(step)),
                }))
                .filter((i) => i.description);

            if (items.length === 0) return undefined;

            return {
                sectionId: Uuid(),
                name: decodeHtml(group.name) ?? "Method",
                items,
            };
        })
        .filter(Undefined);
};

/** Configuration for tag extraction. Specifies which recipe fields contribute to which tag groups. */
const TAG_EXTRACTION_CONFIG = [
    {
        sourceField: "recipeCuisine" as const,
        groups: ["Cuisine"] as const,
    },
    {
        sourceField: "recipeCategory" as const,
        groups: ["Meal", "Dietary"] as const,
    },
    {
        sourceField: "keywords" as const,
        groups: ["Cuisine", "Meal", "Dietary", "Season", "Difficulty"] as const,
    },
] as const;

const parseSource = (input: RecipeSchema): string | undefined => {
    if (input["@id"]) return input["@id"].trim();

    if ("url" in input && typeof input.url === "string")
        return input.url.trim();

    if (input.mainEntityOfPage) {
        if (typeof input.mainEntityOfPage === "string")
            return input.mainEntityOfPage.trim();
        if (
            typeof input.mainEntityOfPage === "object" &&
            "@id" in input.mainEntityOfPage
        ) {
            return input.mainEntityOfPage["@id"]?.trim();
        }
    }
    return undefined;
};

const parseTags = (recipe: RecipeSchema): TagRef[] | undefined => {
    const tags = new Map<string, TagRef>();

    /**
     * Extract keywords/categories from a field.
     * Handles strings (comma-separated), arrays, and nested objects.
     */
    const extractCandidates = (input: unknown): Set<string> => {
        const candidates = new Set<string>();
        const collect = (val: unknown) => {
            if (typeof val === "string") {
                val.split(",").forEach((s) => {
                    candidates.add(s.trim().toLowerCase());
                });
            } else if (Array.isArray(val)) {
                val.forEach(collect);
            }
        };
        collect(input);
        return candidates;
    };

    /**
     * Match extracted candidates against a tag group.
     * Adds matching tags to the main map.
     */
    const matchGroup = (candidates: Set<string>, group: string) => {
        if (group in DEFINITIONS) {
            const groupDef = DEFINITIONS[group as keyof typeof DEFINITIONS];
            for (const tag of Object.values(groupDef.children)) {
                if (candidates.has(tag.name.toLowerCase())) {
                    tags.set(tag.tagId, { tagId: tag.tagId });
                }
            }
        }
    };

    // Apply configuration to extract tags from recipe fields
    for (const config of TAG_EXTRACTION_CONFIG) {
        const candidates = extractCandidates(
            recipe[config.sourceField as keyof RecipeSchema],
        );
        for (const group of config.groups) {
            matchGroup(candidates, group);
        }
    }

    return tags.size > 0 ? Array.from(tags.values()) : undefined;
};

export const convertRecipe = (
    input: RecipeSchema,
): components["schemas"]["ExtractedRecipe"] => ({
    name: decodeHtml(input.name?.toString()) ?? "Untitled Recipe",
    summary: decodeHtml(input.description?.toString()),
    prepTime: parseDuration(input.prepTime),
    cookTime: parseDuration(input.cookTime),
    servings: parseYield(input.recipeYield),
    ingredients: parseIngredients(input.recipeIngredient),
    method: parseInstructions(input.recipeInstructions),
    source: parseSource(input),
    tags: parseTags(input),
    additionalData: {
        imageUrl: selectBestImage(input.image),
    },
});
