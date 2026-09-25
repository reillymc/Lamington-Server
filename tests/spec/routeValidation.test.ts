import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    readOpenApiOperations,
    TAG_TEST_FILE_OVERRIDES,
} from "../helpers/openapi.ts";

/**
 * This test ensures that for each OpenAPI operation defined in openapi.yaml,
 * there exists a corresponding test case in the appropriate test file under tests/routes/.
 *
 * It reads the OpenAPI specification, extracts the operations grouped by tags,
 * and checks that each operation has a matching describe block in the relevant test file.
 */
describe("Route Validation", () => {
    const operationsByTag = readOpenApiOperations().reduce<
        Record<string, string[]>
    >((operations, { tags, summary }) => {
        for (const tag of tags) {
            operations[tag] ??= [];
            if (summary) {
                operations[tag].push(summary);
            }
        }
        return operations;
    }, {});

    for (const [tag, summaries] of Object.entries(operationsByTag)) {
        it(`should have tests for ${tag} endpoints`, () => {
            if (summaries.length === 0) return;

            const tagFileName =
                TAG_TEST_FILE_OVERRIDES[tag] ?? tag.toLowerCase();
            const testFileName = `${tagFileName}.test.ts`;
            const testFilePath = path.join(
                process.cwd(),
                "tests",
                "routes",
                testFileName,
            );

            if (!fs.existsSync(testFilePath)) {
                throw new Error(`Test file ${testFileName} does not exist`);
            }

            const testFileContent = fs.readFileSync(testFilePath, "utf-8");
            for (const summary of summaries) {
                if (!testFileContent.includes(`describe("${summary}"`)) {
                    throw new Error(
                        `Missing describe block for "${summary}" in ${testFileName}`,
                    );
                }
            }
        });
    }
});
