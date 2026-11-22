import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parse } from "yaml";
import type {
    ExtractedRecipeMetadata,
    NormalizedExtractedRecipe,
} from "./index.ts";

type OpenApiContract = {
    components?: {
        schemas?: Record<string, unknown>;
    };
};

const contractPath = fileURLToPath(
    new URL("../../../../specs/extractor/openapi.yaml", import.meta.url),
);
const contract = parse(readFileSync(contractPath, "utf8")) as OpenApiContract;
const schemas = contract.components?.schemas;

if (!schemas) {
    throw new Error("Extractor contract is missing components.schemas");
}

const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
});

const baseSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    components: { schemas },
};

const validateRecipeSchema = ajv.compile({
    ...baseSchema,
    $ref: "#/components/schemas/ExtractedRecipe",
});

const validateMetadataSchema = ajv.compile({
    ...baseSchema,
    $ref: "#/components/schemas/ExtractedRecipeMetadata",
});

export const validateNormalizedRecipe = (
    value: unknown,
): value is NormalizedExtractedRecipe => validateRecipeSchema(value) === true;

export const validateRecipeMetadata = (
    value: unknown,
): value is ExtractedRecipeMetadata => validateMetadataSchema(value) === true;
