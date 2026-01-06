import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { parse } from "yaml";

/**
 * This test ensures that for each OpenAPI operation defined in openapi.yaml,
 * there exists a corresponding test case in the appropriate test file under tests/routes/.
 *
 * It reads the OpenAPI specification, extracts the operations grouped by tags,
 * and checks that each operation has a matching describe block in the relevant test file.
 */
describe("OpenAPI Spec", () => {
    const openApiPath = path.join(process.cwd(), "openapi.yaml");
    const openApiContent = fs.readFileSync(openApiPath, "utf-8");
    const doc = parse(openApiContent) as any;

    const operationsByTag: Record<string, string[]> = {};

    if (doc.paths) {
        for (const pathItem of Object.values(doc.paths) as any[]) {
            for (const method of Object.keys(pathItem)) {
                if (["get", "post", "put", "delete", "patch"].includes(method)) {
                    const operation = pathItem[method];
                    if (operation.tags && Array.isArray(operation.tags)) {
                        for (const tag of operation.tags) {
                            if (!operationsByTag[tag]) {
                                operationsByTag[tag] = [];
                            }
                            if (operation.summary) {
                                operationsByTag[tag].push(operation.summary);
                            }
                        }
                    }
                }
            }
        }
    }

    const tags = doc.tags ? doc.tags.map((t: any) => t.name) : Object.keys(operationsByTag);

    for (const tag of tags) {
        it(`should have tests for ${tag} endpoints`, () => {
            const summaries = operationsByTag[tag];
            if (!summaries || summaries.length === 0) return;

            const testFileName = `${tag.toLowerCase()}.test.ts`;
            const testFilePath = path.join(process.cwd(), "tests", "routes", testFileName);

            if (fs.existsSync(testFilePath)) {
                const testFileContent = fs.readFileSync(testFilePath, "utf-8");
                for (const summary of summaries) {
                    if (!testFileContent.includes(`describe("${summary}"`)) {
                        throw new Error(`Missing describe block for "${summary}" in ${testFileName}`);
                    }
                }
            } else {
                throw new Error(`Test file ${testFileName} does not exist`);
            }
        });
    }
});
