import type { components } from "./schema.d.ts";

type Schemas = components["schemas"];

export type ExtractedRecipeMetadata = Schemas["ExtractedRecipeMetadata"];
export type NormalizedExtractedRecipe = Schemas["ExtractedRecipe"];
export type TagCandidates = Schemas["TagCandidates"];
